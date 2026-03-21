import clsx from 'clsx';
import { Badge, Button, Spinner } from '@/shared/ui';
import { t } from '@/shared/i18n';
import { useToast } from '@/shared/ui/ToastProvider';
import { useZipStore } from '../model/useZipStore';
import type { ZipStatus } from '@/shared/types';

function statusVariant(status: ZipStatus): 'success' | 'error' | 'warning' | 'muted' | 'default' {
  switch (status) {
    case 'matched': return 'success';
    case 'orphaned_zip': return 'warning';
    case 'missing_zip': return 'error';
    case 'mismatched': return 'error';
    default: return 'muted';
  }
}

function statusLabel(status: ZipStatus): string {
  switch (status) {
    case 'matched': return t('zipRecovery.status.matched');
    case 'orphaned_zip': return t('zipRecovery.status.orphaned');
    case 'missing_zip': return t('zipRecovery.status.missing');
    case 'mismatched': return t('zipRecovery.status.mismatched');
    default: return t('zipRecovery.status.unknown');
  }
}

interface ZipRecoveryViewProps {
  artistPath: string;
}

export function ZipRecoveryView({ artistPath }: ZipRecoveryViewProps) {
  const results = useZipStore((s) => s.results);
  const verifying = useZipStore((s) => s.verifying);
  const restoring = useZipStore((s) => s.restoring);
  const error = useZipStore((s) => s.error);
  const verifyArtistPath = useZipStore((s) => s.verifyArtistPath);
  const restoreFromZip = useZipStore((s) => s.restoreFromZip);
  const getOrphanedCount = useZipStore((s) => s.getOrphanedCount);
  const getMissingCount = useZipStore((s) => s.getMissingCount);
  const toast = useToast();

  const orphanedCount = getOrphanedCount();
  const missingCount = getMissingCount();

  async function handleVerify() {
    await verifyArtistPath(artistPath);
  }

  async function handleRestore(zipPath: string, targetDir: string) {
    try {
      await restoreFromZip(zipPath, targetDir);
      toast.success(t('zipRecovery.restored'));
      // Re-verify after restore
      await verifyArtistPath(artistPath);
    } catch {
      toast.error(t('zipRecovery.restoreError'));
    }
  }

  return (
    <div>
      {/* Summary badges */}
      {results.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {orphanedCount > 0 && (
            <Badge variant="warning">
              {t('zipRecovery.orphanedCount').replace('{n}', String(orphanedCount))}
            </Badge>
          )}
          {missingCount > 0 && (
            <Badge variant="error">
              {t('zipRecovery.missingCount').replace('{n}', String(missingCount))}
            </Badge>
          )}
          {orphanedCount === 0 && missingCount === 0 && (
            <Badge variant="success">All zips matched</Badge>
          )}
        </div>
      )}

      {/* Verify button */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="primary"
          onClick={handleVerify}
          disabled={verifying}
        >
          {verifying ? (
            <>
              <Spinner size="sm" />
              <span className="ml-2">{t('zipRecovery.verifying')}</span>
            </>
          ) : (
            t('zipRecovery.verify')
          )}
        </Button>
        {error && (
          <p className="text-sm text-[var(--error)]">{error}</p>
        )}
      </div>

      {/* Results table */}
      {results.length === 0 && !verifying ? (
        <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('zipRecovery.noResults')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-[var(--card-radius)] border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b text-xs font-medium uppercase tracking-wider"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <th className="px-4 py-2 text-left">Gallery</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((entry, i) => (
                <tr
                  key={i}
                  className={clsx(
                    'border-b last:border-b-0',
                    'transition-colors hover:bg-[var(--bg-hover)]',
                  )}
                  style={{ borderColor: 'var(--border)' }}
                >
                  <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                    <span className="font-medium">{entry.gallery}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(entry.status)}>
                      {statusLabel(entry.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(entry.status === 'orphaned_zip' || entry.status === 'mismatched') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={restoring}
                        onClick={() => handleRestore(`${artistPath}/${entry.gallery}.zip`, `${artistPath}/${entry.gallery}`)}
                      >
                        {restoring ? <Spinner size="sm" /> : t('zipRecovery.restore')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
