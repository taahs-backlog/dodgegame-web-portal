import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { message: "Identifier and password are required." },
        { status: 400 },
      );
    }

    let emailToUse = identifier as string;

    if (!identifier.includes("@")) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", identifier)
        .limit(1)
        .single();

      if (profileError) {
        return NextResponse.json(
          {
            message:
              profileError.code === "PGRST116"
                ? "No account found for that username."
                : "Unable to look up username.",
          },
          { status: 400 },
        );
      }

      if (!profile?.user_id) {
        return NextResponse.json(
          { message: "No account found for that username." },
          { status: 400 },
        );
      }

      console.log(profile.user_id)
      console.log(await supabase.auth.admin.getUserById(profile.user_id))
      const { data: user } = await supabase.auth.admin.getUserById(profile.user_id);
      console.log(user)
      emailToUse = user.user?.email ?? "";
    }

    const response = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    });

    if (response.error) {
      return NextResponse.json(
        { message: response.error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: "Logged in successfully.",
      user: response.data.user,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Invalid JSON body", error: `${error}` },
      { status: 400 },
    );
  }
}
