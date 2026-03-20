export interface Volume {
  id: number;
  uuid: string;
  label: string | null;
  mountPath: string | null;
  isOnline: boolean;
  isRemovable: boolean;
  totalBytes: number | null;
  lastSeen: string | null;
}
