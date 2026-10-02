export type createUserRepo = {
  email: string;
  full_name: string;
  password_hash: string;
};

export type createGoogleUserRepo = {
  email: string;
  full_name: string;
  google_id: string;
  avatar_url: string | null;
};
