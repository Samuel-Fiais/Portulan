export type PublicAccount = {
  id: string;
  login: string;
  name: string | null;
  email: string | null;
  image: string | null;
  hasGithub: boolean;
  hasPassword: boolean;
};
