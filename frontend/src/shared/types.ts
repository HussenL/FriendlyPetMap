export type Incident = {
  incident_id: string;
  lng: number;
  lat: number;
  title: string;
};

export type AppAuthResponse = {
  app_token: string;
  profile?: Record<string, any>;
};
