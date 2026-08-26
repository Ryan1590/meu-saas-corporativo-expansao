<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use App\Models\Filiais;
use App\Models\FilialDocumento;
use App\Models\FilialDocumentoObrigatorio;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Legacy System Events & User Metrics (Admin Only)
     */
    public function systemEvents(): JsonResponse
    {
        $totalUsers = User::query()->count();
        $activeUsers = User::query()->where('status', 'active')->count();
        $inactiveUsers = User::query()->where('status', 'inactive')->count();
        $totalRoles = Role::query()->count();

        $recentUsers = User::query()
            ->with(['roles.permissions'])
            ->latest()
            ->limit(5)
            ->get();

        $recentActivities = ActivityLog::query()
            ->with('user:id,name,email')
            ->latest()
            ->limit(8)
            ->get();

        $registrationsOverTime = collect(range(6, 0))->map(function (int $daysAgo) {
            $date = now()->subDays($daysAgo)->startOfDay();
            $next = $date->copy()->endOfDay();

            return [
                'date' => $date->format('d/m'),
                'users' => User::query()->whereBetween('created_at', [$date, $next])->count(),
                'active' => User::query()
                    ->whereBetween('created_at', [$date, $next])
                    ->where('status', 'active')
                    ->count(),
            ];
        })->values();

        $activityByModule = ActivityLog::query()
            ->selectRaw('module, COUNT(*) as count')
            ->groupBy('module')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => [
                'module' => (string) $row->module,
                'count' => (int) $row->count,
            ])
            ->values();

        $roleColors = [
            'admin' => '#4f46e5',
            'manager' => '#0ea5e9',
            'operator' => '#10b981',
            'auditor' => '#f59e0b',
        ];

        $usersByRole = Role::query()
            ->withCount('users')
            ->get()
            ->map(function (Role $role) use ($roleColors) {
                return [
                    'role' => $role->label,
                    'count' => (int) $role->users_count,
                    'color' => $roleColors[$role->name] ?? '#64748b',
                ];
            })
            ->values();

        $usersGrowthPercentage = $totalUsers > 0
            ? (int) round(($recentUsers->count() / max($totalUsers, 1)) * 100)
            : 0;

        $activePercentage = $totalUsers > 0
            ? (int) round(($activeUsers / $totalUsers) * 100)
            : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'totalUsers' => $totalUsers,
                'activeUsers' => $activeUsers,
                'inactiveUsers' => $inactiveUsers,
                'totalRoles' => $totalRoles,
                'recentLoginsCount' => ActivityLog::query()->where('action', 'login')->count(),
                'usersGrowthPercentage' => $usersGrowthPercentage,
                'activePercentage' => $activePercentage,
                'registrationsOverTime' => $registrationsOverTime,
                'usersByRole' => $usersByRole,
                'activityByModule' => $activityByModule,
                'recentUsers' => UserResource::collection($recentUsers)->resolve(),
                'recentActivities' => $recentActivities->map(function (ActivityLog $log) {
                    return [
                        'id' => (string) $log->id,
                        'userId' => $log->user_id ? (string) $log->user_id : '',
                        'userName' => $log->user?->name ?? 'Sistema',
                        'userEmail' => $log->user?->email ?? 'system@local',
                        'action' => (string) $log->action,
                        'module' => (string) $log->module,
                        'description' => (string) $log->description,
                        'ipAddress' => (string) ($log->ip_address ?? '-'),
                        'userAgent' => (string) ($log->user_agent ?? '-'),
                        'details' => $log->details,
                        'createdAt' => $log->created_at?->toISOString(),
                    ];
                })->values(),
            ],
        ]);
    }

    /**
     * Main Document & Filiais Dashboard Metrics
     */
    public function index(Request $request): JsonResponse
    {
        $hoje = Carbon::today();
        $em30dias = $hoje->copy()->addDays(30);

        // 1. Estrutural Metrics
        $filiais = Filiais::all();
        $totalFiliais = $filiais->count();

        $totalPredioProprio = $filiais->where('predio', 'Próprio')->count();
        $totalPredioTerceiro = $filiais->where('predio', 'Terceiro')->count();
        $totalPredioProprioTerceiro = $filiais->filter(fn ($f) => in_array($f->predio, ['Próprio/Terceiro', 'PRÓPRIO/ALUGADO']))->count();

        $industrias = $filiais->where('tipo', 'Indústria');
        $totalIndustria = $industrias->count();
        $totalMetragemIndustria = $industrias->sum(fn ($f) => (float) $f->metragem_quadrada);

        $lojas = $filiais->where('tipo', 'Loja');
        $totalLojas = $lojas->count();
        $totalMetragemLojas = $lojas->sum(fn ($f) => (float) $f->metragem_quadrada);

        $cds = $filiais->where('tipo', 'Centro de Distribuição');
        $totalCentroDistribuicao = $cds->count();
        $totalMetragemCD = $cds->sum(fn ($f) => (float) $f->metragem_quadrada);

        $autopostos = $filiais->where('tipo', 'Auto Posto Gazin');
        $totalMetragemAutoPosto = $autopostos->sum(fn ($f) => (float) $f->metragem_quadrada);

        // 2. Documental Metrics & Status
        $documentosAll = FilialDocumento::all()->keyBy('idfilial');
        $obrigatoriosAll = FilialDocumentoObrigatorio::all()->groupBy('idfilial');

        $docMap = [
            'alvara_corpo_bombeiro' => 'Alvará Corpo de Bombeiro',
            'alvara_funcionamento' => 'Alvará de Funcionamento',
            'alvara_ambiental' => 'Alvará Ambiental',
            'certificado_brigada' => 'Certificado de Brigada',
        ];

        $statusCount = ['ok' => 0, 'vence' => 0, 'vencido' => 0];
        $porDocumento = [
            'Alvará Corpo de Bombeiro' => 0,
            'Alvará de Funcionamento' => 0,
            'Alvará Ambiental' => 0,
            'Certificado de Brigada' => 0,
        ];

        $filiaisOkCount = 0;
        $filiaisVencidasCount = 0;
        $filiaisVencendoCount = 0;
        $totalDocumentosAnexados = 0;
        $totalFaltandoCount = 0;
        $filiaisRiscoCriticoCount = 0;

        $bombeirosOkCount = 0;
        $funcionamentoOkCount = 0;

        $proximosVencimentosList = [];
        $faltandoList = [];

        foreach ($filiais as $f) {
            $docRecord = $documentosAll->get($f->idfilial);
            $obrigs = ($obrigatoriosAll->get($f->idfilial) ?? collect())->pluck('documento')->toArray();

            $fHasVencido = false;
            $fHasVencendo = false;
            $fHasPendente = false;
            $fHasRiscoCritico = false;
            $fDocsMissingNames = [];

            foreach ($docMap as $field => $label) {
                $pathCol = "{$field}_path";
                $vencCol = "{$field}_vencimento";

                $path = $docRecord ? $docRecord->{$pathCol} : null;
                $venc = $docRecord && $docRecord->{$vencCol} ? Carbon::parse($docRecord->{$vencCol})->startOfDay() : null;

                if (!empty($path)) {
                    $totalDocumentosAnexados++;
                }

                // Documento é pendente/faltando SE estiver marcado como obrigatório E o anexo estiver vazio
                if (in_array($field, $obrigs) && empty($path)) {
                    $fHasPendente = true;
                    $totalFaltandoCount++;
                    $fDocsMissingNames[] = $label;
                }

                if ($venc) {
                    if ($venc->lt($hoje)) {
                        $statusCount['vencido']++;
                        $porDocumento[$label]++;
                        $fHasVencido = true;
                        $dias = (int) $venc->diffInDays($hoje) * -1;

                        if ($venc->lt($hoje->copy()->subDays(7))) {
                            $fHasRiscoCritico = true;
                        }

                        $proximosVencimentosList[] = [
                            'idfilial' => $f->idfilial,
                            'filial' => $f->filial,
                            'uf' => $f->uf ?? 'PR',
                            'documento' => $label,
                            'vencimento' => $venc->format('Y-m-d'),
                            'dias' => $dias,
                            'status' => 'Vencido',
                        ];
                    } elseif ($venc->lte($em30dias)) {
                        $statusCount['vence']++;
                        $fHasVencendo = true;
                        $dias = (int) $hoje->diffInDays($venc);

                        $proximosVencimentosList[] = [
                            'idfilial' => $f->idfilial,
                            'filial' => $f->filial,
                            'uf' => $f->uf ?? 'PR',
                            'documento' => $label,
                            'vencimento' => $venc->format('Y-m-d'),
                            'dias' => $dias,
                            'status' => 'Vence em breve',
                        ];
                    } else {
                        $statusCount['ok']++;
                    }

                    if ($field === 'alvara_corpo_bombeiro' && $venc->gte($hoje) && !empty($path)) {
                        $bombeirosOkCount++;
                    }
                    if ($field === 'alvara_funcionamento' && $venc->gte($hoje) && !empty($path)) {
                        $funcionamentoOkCount++;
                    }
                } else {
                    if (!empty($path)) {
                        $statusCount['ok']++;
                    }
                }
            }

            if ($fHasVencido) {
                $filiaisVencidasCount++;
            }
            if ($fHasVencendo && !$fHasVencido) {
                $filiaisVencendoCount++;
            }
            if (!$fHasVencido && !$fHasPendente) {
                $filiaisOkCount++;
            }
            if ($fHasRiscoCritico) {
                $filiaisRiscoCriticoCount++;
            }

            if (!empty($fDocsMissingNames)) {
                $faltandoList[] = [
                    'idfilial' => $f->idfilial,
                    'filial' => $f->filial,
                    'uf' => $f->uf ?? 'PR',
                    'documentos' => $fDocsMissingNames,
                ];
            }
        }

        // Ordena por data de vencimento ASC (as datas mais antigas/mais atrasadas primeiro)
        usort($proximosVencimentosList, fn ($a, $b) => strcmp($a['vencimento'], $b['vencimento']));

        // Paginators for the two tables
        $pageVenc = (int) $request->query('pageVenc', 1);
        $perPageVenc = (int) $request->query('perPageVenc', 5);
        $sliceVenc = array_slice($proximosVencimentosList, ($pageVenc - 1) * $perPageVenc, $perPageVenc);

        $pageFalt = (int) $request->query('pageFalt', 1);
        $perPageFalt = (int) $request->query('perPageFalt', 5);
        $sliceFalt = array_slice($faltandoList, ($pageFalt - 1) * $perPageFalt, $perPageFalt);

        $taxaConformidade = $totalFiliais > 0
            ? round(($filiaisOkCount / $totalFiliais) * 100, 1)
            : 0;

        $taxaBombeiros = $totalFiliais > 0
            ? round(($bombeirosOkCount / $totalFiliais) * 100, 1)
            : 0;

        $taxaFuncionamento = $totalFiliais > 0
            ? round(($funcionamentoOkCount / $totalFiliais) * 100, 1)
            : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'estrutural' => [
                    'totalFiliais' => $totalFiliais,
                    'totalPredioProprio' => $totalPredioProprio,
                    'totalPredioTerceiro' => $totalPredioTerceiro,
                    'totalPredioProprioTerceiro' => $totalPredioProprioTerceiro,
                    'totalIndustria' => $totalIndustria,
                    'totalMetragemIndustria' => $totalMetragemIndustria,
                    'totalLojas' => $totalLojas,
                    'totalMetragemLojas' => $totalMetragemLojas,
                    'totalCentroDistribuicao' => $totalCentroDistribuicao,
                    'totalMetragemCD' => $totalMetragemCD,
                    'totalMetragemAutoPosto' => $totalMetragemAutoPosto,
                ],
                'documental' => [
                    'filiaisOk' => $filiaisOkCount,
                    'filiaisVencidas' => $filiaisVencidasCount,
                    'filiaisVencendo' => $filiaisVencendoCount,
                    'totalDocumentos' => $totalDocumentosAnexados,
                    'taxaConformidade' => $taxaConformidade,
                    'totalFaltando' => $totalFaltandoCount,
                    'filiaisRiscoCritico' => $filiaisRiscoCriticoCount,
                    'taxaBombeiros' => $taxaBombeiros,
                    'taxaFuncionamento' => $taxaFuncionamento,
                ],
                'status' => $statusCount,
                'porDocumento' => $porDocumento,
                'proximosVencimentos' => [
                    'data' => $sliceVenc,
                    'meta' => [
                        'currentPage' => $pageVenc,
                        'lastPage' => (int) ceil(count($proximosVencimentosList) / max($perPageVenc, 1)),
                        'perPage' => $perPageVenc,
                        'total' => count($proximosVencimentosList),
                    ],
                ],
                'faltando' => [
                    'data' => $sliceFalt,
                    'meta' => [
                        'currentPage' => $pageFalt,
                        'lastPage' => (int) ceil(count($faltandoList) / max($perPageFalt, 1)),
                        'perPage' => $perPageFalt,
                        'total' => count($faltandoList),
                    ],
                ],
            ],
        ]);
    }

    /**
     * Export Próximos Vencimentos CSV
     */
    public function exportarVencimentos()
    {
        $hoje = Carbon::today();
        $em30dias = $hoje->copy()->addDays(30);

        $filiais = Filiais::all();
        $documentosAll = FilialDocumento::all()->keyBy('idfilial');

        $docMap = [
            'alvara_corpo_bombeiro' => 'Alvará Corpo de Bombeiro',
            'alvara_funcionamento' => 'Alvará de Funcionamento',
            'alvara_ambiental' => 'Alvará Ambiental',
            'certificado_brigada' => 'Certificado de Brigada',
        ];

        $items = [];

        foreach ($filiais as $f) {
            $docRecord = $documentosAll->get($f->idfilial);
            if (!$docRecord) continue;

            foreach ($docMap as $field => $label) {
                $vencCol = "{$field}_vencimento";
                $venc = $docRecord->{$vencCol} ? Carbon::parse($docRecord->{$vencCol})->startOfDay() : null;

                if ($venc && $venc->lte($em30dias)) {
                    $isVencido = $venc->lt($hoje);
                    $dias = $isVencido ? (int) $venc->diffInDays($hoje) * -1 : (int) $hoje->diffInDays($venc);
                    $status = $isVencido ? 'Vencido' : 'Vence em breve';
                    $diasTexto = $isVencido ? abs($dias) . ' dias atrasado' : $dias . ' dias';

                    $items[] = [
                        'vencimento' => $venc->format('Y-m-d'),
                        'linha' => implode(';', [
                            $f->idfilial,
                            $f->filial,
                            $f->uf ?? 'PR',
                            $label,
                            $venc->format('d/m/Y'),
                            $diasTexto,
                            $status,
                        ]),
                    ];
                }
            }
        }

        // Ordenar por data de vencimento ASC (mais antigo/atrasado primeiro)
        usort($items, fn ($a, $b) => strcmp($a['vencimento'], $b['vencimento']));

        $csvLines = [];
        $csvLines[] = 'ID Filial;Filial;UF;Documento;Vencimento;Dias;Status';
        foreach ($items as $item) {
            $csvLines[] = $item['linha'];
        }

        $csvContent = "\xEF\xBB\xBF" . implode("\n", $csvLines);
        return response($csvContent, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="proximos_vencimentos_' . date('Ymd_His') . '.csv"',
        ]);
    }

    /**
     * Export Documentos Faltando CSV
     */
    public function exportarFaltando()
    {
        $filiais = Filiais::all();
        $documentosAll = FilialDocumento::all()->keyBy('idfilial');
        $obrigatoriosAll = FilialDocumentoObrigatorio::all()->groupBy('idfilial');

        $docMap = [
            'alvara_corpo_bombeiro' => 'Alvará Corpo de Bombeiro',
            'alvara_funcionamento' => 'Alvará de Funcionamento',
            'alvara_ambiental' => 'Alvará Ambiental',
            'certificado_brigada' => 'Certificado de Brigada',
        ];

        $csvLines = [];
        $csvLines[] = 'ID Filial;Filial;UF;Documentos Pendentes';

        foreach ($filiais as $f) {
            $docRecord = $documentosAll->get($f->idfilial);
            $obrigs = ($obrigatoriosAll->get($f->idfilial) ?? collect())->pluck('documento')->toArray();
            $missing = [];

            foreach ($docMap as $field => $label) {
                $pathCol = "{$field}_path";
                $path = $docRecord ? $docRecord->{$pathCol} : null;
                if (in_array($field, $obrigs) && empty($path)) {
                    $missing[] = $label;
                }
            }

            if (!empty($missing)) {
                $csvLines[] = implode(';', [
                    $f->idfilial,
                    $f->filial,
                    $f->uf ?? 'PR',
                    implode(', ', $missing),
                ]);
            }
        }

        $csvContent = "\xEF\xBB\xBF" . implode("\n", $csvLines);
        return response($csvContent, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="documentos_faltando_' . date('Ymd_His') . '.csv"',
        ]);
    }
}
