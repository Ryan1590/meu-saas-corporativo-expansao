<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Filiais;
use App\Models\FilialDocumento;
use App\Models\FilialDocumentoObrigatorio;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class FilialController extends Controller
{
    /**
     * Display a listing of filiais with search, filter, sorting and pagination.
     */
    public function index(Request $request)
    {
        $query = Filiais::query();

        if ($request->filled('filtro_idfilial')) {
            $query->where('idfilial', $request->query('filtro_idfilial'));
        } elseif ($request->filled('idfilial')) {
            $query->where('idfilial', $request->query('idfilial'));
        }

        if ($request->filled('filial')) {
            $query->where('filial', 'like', '%' . $request->query('filial') . '%');
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('filial', 'like', "%{$search}%")
                  ->orWhere('idfilial', 'like', "%{$search}%")
                  ->orWhere('predio', 'like', "%{$search}%")
                  ->orWhere('tipo', 'like', "%{$search}%");
            });
        }

        if ($request->filled('predio')) {
            $query->where('predio', $request->query('predio'));
        }

        if ($request->filled('tipo')) {
            $query->where('tipo', $request->query('tipo'));
        }

        $sortColumn = $request->query('sortColumn', $request->query('sort', 'idfilial'));
        $sortDirection = $request->query('sortDirection', $request->query('direction', 'asc'));

        $allowedSorts = ['idfilial', 'filial', 'predio', 'metragem_quadrada', 'tipo', 'created_at'];
        if (!in_array($sortColumn, $allowedSorts)) {
            $sortColumn = 'idfilial';
        }

        $query->orderBy($sortColumn, strtolower($sortDirection) === 'desc' ? 'desc' : 'asc');

        // CSV Export check
        if ($request->query('export') === 'csv') {
            $filiais = $query->get();
            $csvHeader = ['ID Filial', 'Filial', 'UF', 'Prédio', 'Metragem Quadrada (m²)', 'Tipo'];
            $csvData = [];
            $csvData[] = implode(';', $csvHeader);

            foreach ($filiais as $f) {
                $csvData[] = implode(';', [
                    $f->idfilial,
                    $f->filial,
                    $f->uf ?? '',
                    $f->predio,
                    number_format((float) $f->metragem_quadrada, 2, ',', '.'),
                    $f->tipo,
                ]);
            }

            $csvContent = "\xEF\xBB\xBF" . implode("\n", $csvData);
            return response($csvContent, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="filiais_' . date('Ymd_His') . '.csv"',
            ]);
        }

        $perPage = (int) $request->query('perPage', 10);
        $filiais = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $filiais->items(),
            'meta' => [
                'currentPage' => $filiais->currentPage(),
                'lastPage' => $filiais->lastPage(),
                'perPage' => $filiais->perPage(),
                'total' => $filiais->total(),
            ],
        ]);
    }

    /**
     * Store a newly created filial.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'idfilial' => 'required|integer|unique:filiais,idfilial',
            'filial' => 'required|string|max:255',
            'uf' => 'nullable|string|max:2',
            'predio' => 'required|string|max:255',
            'metragem_quadrada' => 'required',
            'tipo' => 'required|string|max:255',
        ]);

        $filial = Filiais::create($validated);

        FilialDocumento::firstOrCreate([
            'idfilial' => $filial->idfilial,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Filial cadastrada com sucesso!',
            'data' => $filial,
        ], 201);
    }

    /**
     * Import filiais from CSV file.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'planilha' => 'required|file|max:10240',
        ]);

        $file = $request->file('planilha');
        $ext = strtolower($file->getClientOriginalExtension());
        if (!in_array($ext, ['csv', 'txt'])) {
            return response()->json([
                'success' => false,
                'message' => 'O arquivo de planilha deve ser no formato .csv ou .txt',
            ], 422);
        }

        $realPath = $file->getRealPath();
        if (!$realPath || !file_exists($realPath)) {
            return response()->json([
                'success' => false,
                'message' => 'Não foi possível ler o arquivo enviado.',
            ], 422);
        }

        $content = file_get_contents($realPath);
        if ($content === false || trim($content) === '') {
            return response()->json([
                'success' => false,
                'message' => 'O arquivo fornecido está vazio.',
            ], 422);
        }

        // Auto-detect & convert encoding to UTF-8
        if (!mb_check_encoding($content, 'UTF-8')) {
            $content = mb_convert_encoding($content, 'UTF-8', 'ISO-8859-1, Windows-1252, MacRoman');
        }

        // Strip UTF-8 BOM
        $content = preg_replace('/\x{EF}\xBB\xBF/u', '', $content);

        // Normalize newlines
        $content = str_replace(["\r\n", "\r"], "\n", $content);
        $lines = array_filter(explode("\n", $content), fn ($l) => trim($l) !== '');

        if (empty($lines)) {
            return response()->json([
                'success' => false,
                'message' => 'Nenhuma linha válida encontrada no arquivo CSV.',
            ], 422);
        }

        // Auto-detect delimiter from first line
        $firstLine = reset($lines);
        $delimiter = ';';
        $countSemicolon = substr_count($firstLine, ';');
        $countComma = substr_count($firstLine, ',');
        $countTab = substr_count($firstLine, "\t");
        if ($countComma > $countSemicolon && $countComma > $countTab) {
            $delimiter = ',';
        } elseif ($countTab > $countSemicolon && $countTab > $countComma) {
            $delimiter = "\t";
        }

        $headerRow = array_shift($lines);
        $rawHeaders = str_getcsv($headerRow, $delimiter);

        $header = array_map(fn ($h) => $this->normalizeHeaderKey($h), $rawHeaders);

        $importedCount = 0;

        foreach ($lines as $line) {
            $row = str_getcsv($line, $delimiter);
            if (empty($row) || count($row) === 0) {
                continue;
            }

            // Pad or slice row to match header length
            if (count($row) < count($header)) {
                $row = array_pad($row, count($header), '');
            } elseif (count($row) > count($header)) {
                $row = array_slice($row, 0, count($header));
            }

            $data = array_combine($header, array_map('trim', $row));
            if (!$data) {
                continue;
            }

            $idfilialRaw = $data['idfilial'] ?? '';
            $idfilial = (int) preg_replace('/[^0-9]/', '', $idfilialRaw);
            $filialNome = trim($data['filial'] ?? '');

            if (!$idfilial || empty($filialNome)) {
                continue;
            }

            $uf = strtoupper(trim($data['uf'] ?? 'PR'));
            if (empty($uf) || strlen($uf) > 2) {
                $uf = 'PR';
            }

            $predioRaw = mb_strtolower(trim($data['predio'] ?? 'próprio'));
            if (str_contains($predioRaw, 'terceiro') && (str_contains($predioRaw, 'proprio') || str_contains($predioRaw, 'próprio') || str_contains($predioRaw, 'alugado'))) {
                $predio = 'Próprio/Terceiro';
            } elseif (str_contains($predioRaw, 'terceiro') || str_contains($predioRaw, 'alugado')) {
                $predio = 'Terceiro';
            } else {
                $predio = 'Próprio';
            }

            $metragem = trim($data['metragem_quadrada'] ?? '0');

            $tipoRaw = mb_strtolower(trim($data['tipo'] ?? 'loja'));
            if (str_contains($tipoRaw, 'ind') || str_contains($tipoRaw, 'fabrica')) {
                $tipo = 'Indústria';
            } elseif (str_contains($tipoRaw, 'cd') || str_contains($tipoRaw, 'distribui')) {
                $tipo = 'Centro de Distribuição';
            } elseif (str_contains($tipoRaw, 'posto')) {
                $tipo = 'Auto Posto Gazin';
            } else {
                $tipo = 'Loja';
            }

            $filial = Filiais::updateOrCreate(
                ['idfilial' => $idfilial],
                [
                    'filial' => $filialNome,
                    'uf' => $uf,
                    'predio' => $predio,
                    'metragem_quadrada' => $metragem,
                    'tipo' => $tipo,
                ]
            );

            FilialDocumento::firstOrCreate([
                'idfilial' => $filial->idfilial,
            ]);

            $importedCount++;
        }

        return response()->json([
            'success' => true,
            'message' => "{$importedCount} filial(is) importada(s) com sucesso!",
        ]);
    }

    private function normalizeHeaderKey(string $key): string
    {
        $key = preg_replace('/\x{EF}\xBB\xBF/u', '', $key);
        $key = mb_strtolower(trim($key));
        $key = str_replace(['"', "'"], '', $key);

        $keyUnaccented = preg_replace('/[áàãâä]/u', 'a', $key);
        $keyUnaccented = preg_replace('/[éèêë]/u', 'e', $keyUnaccented);
        $keyUnaccented = preg_replace('/[íìîï]/u', 'i', $keyUnaccented);
        $keyUnaccented = preg_replace('/[óòõôö]/u', 'o', $keyUnaccented);
        $keyUnaccented = preg_replace('/[úùûü]/u', 'u', $keyUnaccented);
        $keyUnaccented = preg_replace('/[ç]/u', 'c', $keyUnaccented);

        if (str_contains($keyUnaccented, 'id') && str_contains($keyUnaccented, 'filial')) {
            return 'idfilial';
        }
        if ($keyUnaccented === 'id' || $keyUnaccented === 'id_filial' || $keyUnaccented === 'idfilial') {
            return 'idfilial';
        }

        if (str_contains($keyUnaccented, 'filial') || str_contains($keyUnaccented, 'nome')) {
            return 'filial';
        }

        if ($keyUnaccented === 'uf' || str_contains($keyUnaccented, 'estado')) {
            return 'uf';
        }

        if (str_contains($keyUnaccented, 'predio') || str_contains($keyUnaccented, 'edificio')) {
            return 'predio';
        }

        if (str_contains($keyUnaccented, 'metragem') || str_contains($keyUnaccented, 'area') || str_contains($keyUnaccented, 'm2')) {
            return 'metragem_quadrada';
        }

        if (str_contains($keyUnaccented, 'tipo') || str_contains($keyUnaccented, 'categoria')) {
            return 'tipo';
        }

        return $keyUnaccented;
    }

    /**
     * Display details of a specific filial.
     */
    public function show(string $idfilial): JsonResponse
    {
        $filial = Filiais::where('idfilial', $idfilial)->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $filial,
        ]);
    }

    /**
     * Update specified filial.
     */
    public function update(Request $request, string $idfilial): JsonResponse
    {
        $filial = Filiais::where('idfilial', $idfilial)->firstOrFail();

        $validated = $request->validate([
            'idfilial' => 'required|integer|unique:filiais,idfilial,' . $filial->idfilial . ',idfilial',
            'filial' => 'required|string|max:255',
            'uf' => 'nullable|string|max:2',
            'predio' => 'required|string|max:255',
            'metragem_quadrada' => 'required',
            'tipo' => 'required|string|max:255',
        ]);

        $filial->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Filial atualizada com sucesso!',
            'data' => $filial,
        ]);
    }

    /**
     * Remove specified filial.
     */
    public function destroy(string $idfilial): JsonResponse
    {
        $filial = Filiais::where('idfilial', $idfilial)->firstOrFail();
        $filial->delete();

        return response()->json([
            'success' => true,
            'message' => 'Filial excluída com sucesso!',
        ]);
    }

    /**
     * Get documents and statuses for specified filial.
     */
    public function getDocumentos(string $idfilial): JsonResponse
    {
        $filial = Filiais::where('idfilial', $idfilial)->firstOrFail();

        $documentos = FilialDocumento::firstOrCreate([
            'idfilial' => $filial->idfilial,
        ]);

        $statusDocumentos = [
            'alvara_corpo_bombeiro' => $this->calcularStatus($documentos->alvara_corpo_bombeiro_vencimento),
            'alvara_funcionamento' => $this->calcularStatus($documentos->alvara_funcionamento_vencimento),
            'alvara_ambiental' => $this->calcularStatus($documentos->alvara_ambiental_vencimento),
            'certificado_brigada' => $this->calcularStatus($documentos->certificado_brigada_vencimento),
        ];

        $documentosObrigatorios = FilialDocumentoObrigatorio::where('idfilial', $filial->idfilial)
            ->pluck('documento')
            ->toArray();

        return response()->json([
            'success' => true,
            'data' => [
                'filial' => $filial,
                'documentos' => $documentos,
                'statusDocumentos' => $statusDocumentos,
                'documentosObrigatorios' => $documentosObrigatorios,
            ],
        ]);
    }

    /**
     * Update documents and expiration dates for filial.
     */
    public function updateDocumentos(Request $request, string $idfilial): JsonResponse
    {
        $filial = Filiais::where('idfilial', $idfilial)->firstOrFail();

        $dados = $request->validate([
            'alvara_corpo_bombeiro_arquivo' => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
            'alvara_funcionamento_arquivo' => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
            'alvara_ambiental_arquivo' => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
            'certificado_brigada_arquivo' => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
            'alvara_corpo_bombeiro_vencimento' => 'nullable|date',
            'alvara_funcionamento_vencimento' => 'nullable|date',
            'alvara_ambiental_vencimento' => 'nullable|date',
            'certificado_brigada_vencimento' => 'nullable|date',
            'documentos_obrigatorios' => 'nullable|array',
        ]);

        $documentos = FilialDocumento::firstOrCreate([
            'idfilial' => $filial->idfilial,
        ]);

        $this->atualizarArquivo($request, $documentos, 'alvara_corpo_bombeiro_arquivo', 'alvara_corpo_bombeiro_path', $filial->idfilial);
        $this->atualizarArquivo($request, $documentos, 'alvara_funcionamento_arquivo', 'alvara_funcionamento_path', $filial->idfilial);
        $this->atualizarArquivo($request, $documentos, 'alvara_ambiental_arquivo', 'alvara_ambiental_path', $filial->idfilial);
        $this->atualizarArquivo($request, $documentos, 'certificado_brigada_arquivo', 'certificado_brigada_path', $filial->idfilial);

        $documentos->alvara_corpo_bombeiro_vencimento = $dados['alvara_corpo_bombeiro_vencimento'] ?? null;
        $documentos->alvara_funcionamento_vencimento = $dados['alvara_funcionamento_vencimento'] ?? null;
        $documentos->alvara_ambiental_vencimento = $dados['alvara_ambiental_vencimento'] ?? null;
        $documentos->certificado_brigada_vencimento = $dados['certificado_brigada_vencimento'] ?? null;
        $documentos->save();

        FilialDocumentoObrigatorio::where('idfilial', $filial->idfilial)->delete();

        $docsObrigatorios = $request->input('documentos_obrigatorios');
        if (is_string($docsObrigatorios)) {
            $docsObrigatorios = json_decode($docsObrigatorios, true) ?? [];
        }

        if (is_array($docsObrigatorios)) {
            foreach ($docsObrigatorios as $documento) {
                FilialDocumentoObrigatorio::create([
                    'idfilial' => $filial->idfilial,
                    'documento' => $documento,
                ]);
            }
        }

        return $this->getDocumentos($idfilial);
    }

    /**
     * View/stream document file inline.
     */
    public function showArquivo(string $idfilial, string $tipo)
    {
        $filial = Filiais::where('idfilial', $idfilial)->firstOrFail();
        $documentos = FilialDocumento::where('idfilial', $filial->idfilial)->firstOrFail();

        $camposArquivo = $this->mapaCamposArquivo();
        $campo = $camposArquivo[$tipo] ?? null;

        if ($campo === null) {
            abort(404);
        }

        $caminho = $documentos->{$campo};

        if (empty($caminho) || !Storage::disk('public')->exists($caminho)) {
            abort(404);
        }

        return response()->file(storage_path('app/public/' . ltrim($caminho, '/')));
    }

    /**
     * Export all documents of a filial in ZIP archive.
     */
    public function exportarZip(string $idfilial)
    {
        if (!class_exists('ZipArchive')) {
            return response()->json(['success' => false, 'message' => 'Extensão ZipArchive não encontrada no servidor.'], 500);
        }

        $filial = Filiais::where('idfilial', $idfilial)->firstOrFail();
        $documentos = FilialDocumento::where('idfilial', $filial->idfilial)->first();

        if (!$documentos) {
            return response()->json(['success' => false, 'message' => 'Esta filial ainda não possui documentos para exportar.'], 404);
        }

        $itens = [
            [
                'titulo' => 'Alvara Corpo Bombeiro',
                'pathCampo' => 'alvara_corpo_bombeiro_path',
                'vencimentoCampo' => 'alvara_corpo_bombeiro_vencimento',
            ],
            [
                'titulo' => 'Alvara Funcionamento',
                'pathCampo' => 'alvara_funcionamento_path',
                'vencimentoCampo' => 'alvara_funcionamento_vencimento',
            ],
            [
                'titulo' => 'Alvara Ambiental',
                'pathCampo' => 'alvara_ambiental_path',
                'vencimentoCampo' => 'alvara_ambiental_vencimento',
            ],
            [
                'titulo' => 'Certificado Brigada',
                'pathCampo' => 'certificado_brigada_path',
                'vencimentoCampo' => 'certificado_brigada_vencimento',
            ],
        ];

        $dirTemp = storage_path('app/temp');
        if (!is_dir($dirTemp)) {
            mkdir($dirTemp, 0777, true);
        }

        $nomeBase = preg_replace('/[^A-Za-z0-9_-]/', '_', $filial->filial);
        $zipPath = $dirTemp . DIRECTORY_SEPARATOR . 'documentos_filial_' . $filial->idfilial . '_' . $nomeBase . '_' . now()->format('Ymd_His') . '.zip';

        $zip = new \ZipArchive();
        if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            return response()->json(['success' => false, 'message' => 'Não foi possível gerar o arquivo ZIP.'], 500);
        }

        $linhasCsv = [];
        $linhasCsv[] = 'documento;vencimento;status';

        foreach ($itens as $item) {
            $caminho = $documentos->{$item['pathCampo']};
            $vencimento = $documentos->{$item['vencimentoCampo']};
            $status = $this->calcularStatus($vencimento)['texto'];

            $nomeArquivo = '';

            if (!empty($caminho) && Storage::disk('public')->exists($caminho)) {
                $origem = storage_path('app/public/' . ltrim($caminho, '/'));
                $ext = pathinfo($origem, PATHINFO_EXTENSION);
                $nomeArquivo = $item['titulo'] . ($ext ? '.' . $ext : '');
                $zip->addFile($origem, $nomeArquivo);
            }

            $dataFormatada = $vencimento ? Carbon::parse($vencimento)->format('d/m/Y') : '';
            $linhasCsv[] = $item['titulo'] . ';' . $dataFormatada . ';' . $status;
        }

        $resumoCsv = implode("\n", $linhasCsv);
        $zip->addFromString('resumo_documentos_filial.csv', "\xEF\xBB\xBF" . $resumoCsv);
        $zip->close();

        return response()->download($zipPath)->deleteFileAfterSend(true);
    }

    /**
     * Export individual document file.
     */
    public function exportarIndividual(string $idfilial, string $tipo)
    {
        $filial = Filiais::where('idfilial', $idfilial)->firstOrFail();
        $documentos = FilialDocumento::where('idfilial', $filial->idfilial)->firstOrFail();

        $camposArquivo = $this->mapaCamposArquivo();
        $campo = $camposArquivo[$tipo] ?? null;

        if ($campo === null) {
            abort(404);
        }

        $caminho = $documentos->{$campo};

        if (empty($caminho) || !Storage::disk('public')->exists($caminho)) {
            abort(404);
        }

        $tituloPorTipo = [
            'alvara-corpo-bombeiro' => 'alvara_corpo_bombeiro',
            'alvara-funcionamento' => 'alvara_funcionamento',
            'alvara-ambiental' => 'alvara_ambiental',
            'certificado-brigada' => 'certificado_brigada',
        ];

        $extensao = pathinfo($caminho, PATHINFO_EXTENSION);
        $nomeArquivo = ($tituloPorTipo[$tipo] ?? 'documento') . '_filial_' . $filial->idfilial;
        if (!empty($extensao)) {
            $nomeArquivo .= '.' . $extensao;
        }

        $arquivoFisico = storage_path('app/public/' . ltrim($caminho, '/'));

        return response()->download($arquivoFisico, $nomeArquivo);
    }

    private function atualizarArquivo(Request $request, FilialDocumento $documentos, string $campoRequest, string $campoPath, int $idfilial): void
    {
        if (!$request->hasFile($campoRequest)) {
            return;
        }

        if (!empty($documentos->{$campoPath})) {
            Storage::disk('public')->delete($documentos->{$campoPath});
        }

        $caminho = $request->file($campoRequest)->store('filiais/' . $idfilial . '/documentos', 'public');
        $documentos->{$campoPath} = $caminho;
    }

    private function calcularStatus($vencimento): array
    {
        if (empty($vencimento)) {
            return [
                'tipo' => 'sem_data',
                'texto' => 'Sem vencimento informado',
            ];
        }

        $hoje = Carbon::today();
        $dataVencimento = Carbon::parse($vencimento)->startOfDay();

        if ($dataVencimento->greaterThanOrEqualTo($hoje)) {
            $dias = $hoje->diffInDays($dataVencimento);

            return [
                'tipo' => 'dentro_prazo',
                'texto' => $dias === 0 ? 'Vence hoje' : 'Faltam ' . $dias . ' dia(s) para vencer',
            ];
        }

        $diasVencido = $dataVencimento->diffInDays($hoje);

        return [
            'tipo' => 'vencido',
            'texto' => 'Vencido há ' . $diasVencido . ' dia(s)',
        ];
    }

    private function mapaCamposArquivo(): array
    {
        return [
            'alvara-corpo-bombeiro' => 'alvara_corpo_bombeiro_path',
            'alvara-funcionamento' => 'alvara_funcionamento_path',
            'alvara-ambiental' => 'alvara_ambiental_path',
            'certificado-brigada' => 'certificado_brigada_path',
        ];
    }
}
