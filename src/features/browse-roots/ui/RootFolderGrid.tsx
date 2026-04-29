import type { RootFolder, Volume } from '@/shared/types';
import { RootFolderCard } from './RootFolderCard';
import { AddRootButton } from './AddRootButton';
import { OfflineDrivesSection } from './OfflineDrivesSection';

interface RootFolderGridProps {
  roots: RootFolder[];
  volumes: Volume[];
}

export function RootFolderGrid({ roots, volumes }: RootFolderGridProps) {
  const onlineVolumes = volumes.filter((v) => v.isOnline);
  const offlineVolumeIds = new Set(volumes.filter((v) => !v.isOnline).map((v) => v.id));

  const onlineRoots = roots.filter((r) => !offlineVolumeIds.has(r.volumeId));
  const offlineRoots = roots.filter((r) => offlineVolumeIds.has(r.volumeId));

  return (
    <div>
      {onlineVolumes.map((volume) => {
        const volumeRoots = onlineRoots.filter((r) => r.volumeId === volume.id);
        if (volumeRoots.length === 0) return null;

        return (
          <div key={volume.id} className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              {volume.label ?? volume.mountPath ?? `Volume ${volume.id}`}
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {volumeRoots.map((root) => (
                <RootFolderCard key={root.id} root={root} volume={volume} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Roots on volumes we haven't fetched yet (show ungrouped) */}
      {onlineRoots.filter((r) => !onlineVolumes.some((v) => v.id === r.volumeId)).length > 0 && (
        <div className="mb-6">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {onlineRoots
              .filter((r) => !onlineVolumes.some((v) => v.id === r.volumeId))
              .map((root) => (
                <RootFolderCard key={root.id} root={root} volume={undefined} />
              ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        <AddRootButton />
      </div>

      <OfflineDrivesSection roots={offlineRoots} volumes={volumes} />
    </div>
  );
}
