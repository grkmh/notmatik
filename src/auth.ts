import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Login = z.object({ email: z.string().email(), password: z.string().min(1) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/giris" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const p = Login.safeParse(raw);
        if (!p.success) return null;
        const user = await prisma.user.findUnique({ where: { email: p.data.email.toLowerCase() } });
        if (!user) return null;
        const ok = await bcrypt.compare(p.data.password, user.passwordHash);
        if (!ok || !user.approved) return null; // yönetici onayı yoksa giriş yapılamaz
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    // Oturuma yalnızca kullanıcı kimliği konur; rol her istekte DB'den okunur (bkz. lib/auth/session.ts)
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
