export interface ModelImage {
  data: string; // base64 encoded string
  mimeType: string;
}

export interface GeneratedImage {
  src: string | null | 'error';
  label: string;
  loading: boolean;
}

export interface Pose {
    label: string;
    prompt: string;
}
