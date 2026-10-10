import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Cloud, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  FileJson, 
  Database, 
  Upload, 
  Server, 
  Building2, 
  ShieldCheck, 
  Calendar, 
  HardDrive,
  LogOut,
  FolderUp,
  FileCheck
} from 'lucide-react';
import { CompanySettings, MikrotikConfig } from '../types/index.js';
import { 
  signInWithGoogleDrive, 
  signOutGoogleDrive, 
  uploadBackupToGoogleDrive, 
  listGoogleDriveBackups, 
  getDriveAccessToken,
  DriveBackupFile 
} from '../services/googleDriveService.js';
import { User } from 'firebase/auth';

interface SystemBackupCardProps {
  companySettings: CompanySettings;
  mikrotikConfig?: MikrotikConfig | null;
  onRefreshData?: () => void;
}

export const SystemBackupCard: React.FC<SystemBackupCardProps> = ({
  companySettings,
  mikrotikConfig,
  onRefreshData
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  
  // Google Drive state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState<DriveBackupFile | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveBackups, setDriveBackups] = useState<DriveBackupFile[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);

  // Restore state
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<any | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Fetch full system backup from server
  const fetchBackupPayload = async () => {
    const res = await fetch('/api/backup');
    if (!res.ok) throw new Error('Falha ao obter dados de backup do servidor');
    const data = await res.json();
    return data.backup;
  };

  // 1. Export and Download Local JSON File
  const handleDownloadJSON = async () => {
    setIsExporting(true);
    setDownloadSuccess(null);
    try {
      const backupData = await fetchBackupPayload();
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const safeCompanyName = (companySettings.name || 'provedor')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `backup-config-${safeCompanyName}-${dateStr}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const sizeKB = (blob.size / 1024).toFixed(1);
      setDownloadSuccess(`Arquivo ${fileName} (${sizeKB} KB) baixado com sucesso!`);
      setTimeout(() => setDownloadSuccess(null), 8000);
    } catch (err: any) {
      alert(`Erro ao gerar backup: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Google Drive Connect
  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    setDriveError(null);
    try {
      const result = await signInWithGoogleDrive();
      setGoogleUser(result.user);
      loadDriveBackups();
    } catch (err: any) {
      console.error(err);
      setDriveError(err.message || 'Não foi possível conectar ao Google Drive.');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await signOutGoogleDrive();
      setGoogleUser(null);
      setDriveBackups([]);
      setDriveSuccess(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadDriveBackups = async () => {
    if (!getDriveAccessToken()) return;
    setIsLoadingBackups(true);
    try {
      const files = await listGoogleDriveBackups();
      setDriveBackups(files);
    } catch (err) {
      console.warn(err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  // 3. Save directly to Google Drive
  const handleSaveToGoogleDrive = async () => {
    if (!googleUser || !getDriveAccessToken()) {
      await handleConnectGoogle();
      return;
    }

    setIsSavingToDrive(true);
    setDriveError(null);
    setDriveSuccess(null);

    try {
      const backupData = await fetchBackupPayload();
      const safeCompanyName = (companySettings.name || 'provedor')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `backup-config-${safeCompanyName}-${dateStr}.json`;

      const uploaded = await uploadBackupToGoogleDrive(
        fileName, 
        backupData, 
        `Backup completo do ISP [${companySettings.name}] contendo configurações MikroTik e dados da empresa.`
      );

      setDriveSuccess(uploaded);
      await loadDriveBackups();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Erro ao enviar backup para o Google Drive.';
      if (msg.includes('Permissões do Google Drive') || msg.includes('insufficient authentication scopes')) {
        setGoogleUser(null);
      }
      setDriveError(msg);
    } finally {
      setIsSavingToDrive(false);
    }
  };

  // 4. File picker for restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFile(file);
    setRestoreError(null);
    setRestoreSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.companySettings && !parsed.mikrotikConfig) {
          throw new Error('O arquivo não contém configurações válidas do sistema.');
        }
        setRestorePreview(parsed);
      } catch (err: any) {
        setRestoreError(`Arquivo inválido: ${err.message}`);
        setRestorePreview(null);
      }
    };
    reader.readAsText(file);
  };

  // 5. Apply Restore
  const handleConfirmRestore = async () => {
    if (!restorePreview) return;
    const confirm = window.confirm(
      'Tem certeza de que deseja restaurar as configurações a partir deste backup? As configurações atuais de MikroTik e dados da empresa serão atualizadas.'
    );
    if (!confirm) return;

    setIsRestoring(true);
    setRestoreError(null);
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup: restorePreview })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao restaurar backup');

      setRestoreSuccess('Configurações restauradas com sucesso!');
      setRestoreFile(null);
      setRestorePreview(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setRestoreError(err.message || 'Erro ao aplicar restauração');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-800/80 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Backup Completo das Configurações do Sistema
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  JSON & Google Drive
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Exporte, baixe e sincronize em nuvem todas as configurações do MikroTik, identidade da empresa, gateways e planos.
              </p>
            </div>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1.5 font-mono">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            {companySettings.name}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1.5 font-mono">
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            {mikrotikConfig?.host || '192.168.88.1'}
          </span>
        </div>
      </div>

      {/* Primary Action Buttons: Exportar JSON & Salvar no Google Drive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card 1: Baixar Arquivo JSON Local */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                <FileJson className="w-4 h-4 text-emerald-400" />
                <span>Exportar Arquivo JSON Local</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Download Imediato
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gera e faz o download de um arquivo JSON estruturado contendo dados do MikroTik RouterOS, informações da empresa (CNPJ, logomarca, endereço), planos, torres e faturamento.
            </p>
          </div>

          <div>
            <button
              onClick={handleDownloadJSON}
              disabled={isExporting}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Gerando JSON...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Exportar e Baixar Backup JSON</span>
                </>
              )}
            </button>
          </div>

          {downloadSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{downloadSuccess}</span>
            </div>
          )}
        </div>

        {/* Card 2: Salvar no Google Drive */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                <Cloud className="w-4 h-4 text-sky-400" />
                <span>Salvar no Google Drive</span>
              </div>
              {googleUser ? (
                <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Conectado
                </span>
              ) : (
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Requer Conexão
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Envia e armazena automaticamente o arquivo de backup diretamente na sua conta do Google Drive com segurança em nuvem.
            </p>
          </div>

          {/* User Status / Connect Button */}
          <div className="space-y-2">
            {!googleUser ? (
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isConnectingGoogle}
                className="w-full h-11 px-4 bg-white text-slate-800 hover:bg-slate-100 rounded-xl font-medium text-sm flex items-center justify-center space-x-3 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                {isConnectingGoogle ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
                    <span>Conectando com Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span>Conectar com Google Drive</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <div className="flex items-center space-x-2 truncate">
                    {googleUser.photoURL ? (
                      <img src={googleUser.photoURL} alt="User" className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs">
                        {googleUser.email?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-slate-200 truncate">{googleUser.email}</span>
                  </div>
                  <button
                    onClick={handleDisconnectGoogle}
                    className="text-slate-400 hover:text-rose-400 p-1 transition cursor-pointer"
                    title="Desconectar conta Google"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleSaveToGoogleDrive}
                  disabled={isSavingToDrive}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-sky-600/20 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
                >
                  {isSavingToDrive ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Salvando no Google Drive...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      <span>Salvar no Google Drive</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {driveError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{driveError}</span>
            </div>
          )}

          {driveSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Salvo no Google Drive com sucesso!
                </span>
                {driveSuccess.webViewLink && (
                  <a
                    href={driveSuccess.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-400 hover:underline font-medium"
                  >
                    <span>Abrir</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                {driveSuccess.name}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Lista de Backups Salvos no Google Drive */}
      {googleUser && (
        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <FolderUp className="w-3.5 h-3.5 text-sky-400" />
              Arquivos de Backup no seu Google Drive ({driveBackups.length})
            </h4>
            <button
              onClick={loadDriveBackups}
              disabled={isLoadingBackups}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingBackups ? 'animate-spin' : ''}`} />
              Atualizar lista
            </button>
          </div>

          {driveBackups.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              Nenhum arquivo de backup encontrado ainda. Clique em "Salvar no Google Drive" acima para criar seu primeiro backup na nuvem.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {driveBackups.map((file) => (
                <div 
                  key={file.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 text-xs transition"
                >
                  <div className="flex items-center space-x-2.5 truncate mr-2">
                    <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-slate-200 font-mono text-[11px] truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {file.createdTime ? new Date(file.createdTime).toLocaleString('pt-BR') : 'Data não disponível'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center gap-1 text-[11px] transition font-medium"
                      >
                        Ver no Drive
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Seção Opcional: Restaurar Backup a partir de JSON */}
      <div className="p-4 rounded-xl bg-slate-950/30 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              Restaurar Configurações a partir de um Arquivo JSON
            </h4>
            <p className="text-[11px] text-slate-500">
              Selecione um arquivo de backup previamente exportado para recuperar dados do provedor e MikroTik.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <label className="w-full sm:w-auto cursor-pointer">
            <span className="inline-flex items-center justify-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition">
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Selecionar Arquivo .JSON</span>
            </span>
            <input 
              type="file" 
              accept=".json,application/json" 
              onChange={handleFileChange} 
              className="hidden" 
            />
          </label>

          {restoreFile && (
            <span className="text-xs text-slate-300 font-mono bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 truncate">
              {restoreFile.name} ({(restoreFile.size / 1024).toFixed(1)} KB)
            </span>
          )}

          {restorePreview && (
            <button
              onClick={handleConfirmRestore}
              disabled={isRestoring}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Restaurando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Aplicar e Restaurar Configurações</span>
                </>
              )}
            </button>
          )}
        </div>

        {restorePreview && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-amber-400">Prévia do Backup Selecionado:</p>
            <p>• Provedor: <strong className="text-white">{restorePreview.companySettings?.name || 'Não informado'}</strong> (CNPJ: {restorePreview.companySettings?.cnpj || 'N/A'})</p>
            <p>• MikroTik Host: <strong className="text-white">{restorePreview.mikrotikConfig?.host || 'N/A'}</strong></p>
            <p>• Data da Exportação: {restorePreview.exportedAt ? new Date(restorePreview.exportedAt).toLocaleString('pt-BR') : 'Desconhecida'}</p>
          </div>
        )}

        {restoreSuccess && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{restoreSuccess}</span>
          </div>
        )}

        {restoreError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{restoreError}</span>
          </div>
        )}
      </div>
    </div>
  );
};
