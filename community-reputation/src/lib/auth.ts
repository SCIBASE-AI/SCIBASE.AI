import { getServerSession, type NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";

// Extend next-auth Session type to include user.id.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

// Dev-only credentials provider: sign in as any seeded user by email, no password.
// Never enabled in production.
const devCredentialsProvider = CredentialsProvider({
  id: "demo",
  name: "Demo login",
  credentials: { email: { label: "Email", type: "text" } },
  async authorize(credentials) {
    if (process.env.NODE_ENV === "production") return null;
    if (!credentials?.email) return null;
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
      select: { id: true, email: true, name: true, image: true },
    });
    return user ?? null;
  },
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // JWT strategy so session.user.id is available via token.sub without an
  // extra DB round-trip on every request, while the adapter still handles
  // user creation and account linking on first GitHub login.
  session: { strategy: "jwt" },
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
    ...(process.env.NODE_ENV !== "production" ? [devCredentialsProvider] : []),
  ],
  callbacks: {
    jwt({ token, user }) {
      // On sign-in, user object is present — persist the DB id into the token.
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  // Use a custom sign-in page so we can present the demo switcher.
  pages: { signIn: "/auth/signin" },
};

export class AuthError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
  }
}

// Use in write endpoints — throws AuthError if no session.
export async function requireAuth(): Promise<{ userId: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new AuthError();
  return { userId: session.user.id };
}

// Use in read endpoints — returns null for unauthenticated visitors.
export async function getAuth(): Promise<{ userId: string | null }> {
  const session = await getServerSession(authOptions);
  return { userId: session?.user?.id ?? null };
}
