import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    const { email, username, password } = await request.json();

    let error

    const response = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username
        }
      }
    })

    if (response.error) error = response.error.message

    if (!response.error && response.data.user) {
      console.log("erm")
      // Sync to profiles for username-based login; ignore errors here.
      console.log(await supabase
        .from("profiles")
        .upsert(
          {
            user_id: response.data.user.id,
            username,
          },
          { onConflict: "user_id" },
        ))
    }

    return NextResponse.json({
      message: response.error ? response.error.message : "Account has been created.",
      received: {
        email,
        username,
        passwordLength: typeof password === "string" ? password.length : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Invalid JSON body", error: `${error}` },
      { status: 400 },
    );
  }
}
