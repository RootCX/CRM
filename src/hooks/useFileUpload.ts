import { useState } from "react";
import { useRuntimeClient } from "@rootcx/sdk";
import { APP_ID } from "@/lib/constants";

interface UploadResult {
  file_id: string;
  name: string;
  content_type: string;
  size: number;
}

export function useFileUpload() {
  const client = useRuntimeClient();
  const [uploading, setUploading] = useState(false);

  const baseStorageUrl = () => `${client.getBaseUrl()}/api/v1/apps/${APP_ID}/storage`;

  const authHeaders = () => ({ Authorization: `Bearer ${client.getAccessToken()}` });

  const upload = async (file: File): Promise<UploadResult> => {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${baseStorageUrl()}/upload`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });

    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return await res.json();
  };

  const uploadMany = async (files: File[]): Promise<UploadResult[]> => {
    setUploading(true);
    try {
      const results: UploadResult[] = [];
      for (const file of files) {
        results.push(await upload(file));
      }
      return results;
    } finally {
      setUploading(false);
    }
  };

  const download = async (fileId: string, filename: string) => {
    const res = await fetch(`${baseStorageUrl()}/${fileId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const deleteFile = async (fileId: string) => {
    const res = await fetch(`${baseStorageUrl()}/${fileId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
  };

  return { upload, uploadMany, uploading, download, deleteFile };
}
