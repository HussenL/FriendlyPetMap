export type Incident = {
  incident_id: string;
  lng: number;
  lat: number;
  title: string;
};

export type Comment = {
  comment_id: string;
  incident_id: string;
  content: string;
  created_at: string;
};
