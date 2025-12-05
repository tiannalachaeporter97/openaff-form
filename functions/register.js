// /functions/register.js

const API_URL     = "https://vip.nidajaa.com/api";  // exact URL from working send.php
const AFF_ID      = "28357";                        // your affiliate ID
const OFFER_ID    = "1737";                         // or null if not needed
const FUNNEL_NAME = "AuroraX2";                      // your funnel / offer name

function generatePassword() {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const all   = lower + upper + digits;

  let pwd = "";
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];

  const length = 8 + Math.floor(Math.random() * 5); // 8–12 chars
  while (pwd.length < length) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd;
}

export async function onRequestPost({ request }) {
  try {
    const url  = new URL(request.url);
    const form = await request.formData();

    const first_name = (form.get("first_name") || "").trim();
    const last_name  = (form.get("last_name")  || "").trim();
    const email      = (form.get("email")      || "").trim();
    const phone      = (form.get("phone")      || "").trim();

    // keep the currently working behaviour: no "+" in phonecc
    const phonecc    = (form.get("phonecc")    || "49").replace("+", "");
    const country    = form.get("country") || "DE";
    const aff_sub    = form.get("aff_sub") || "";

    const password   = generatePassword();

    const user_ip = request.headers.get("CF-Connecting-IP") || "149.36.50.163";

    const params = new URLSearchParams({
      first_name,
      last_name,
      email,
      password,
      phonecc,
      phone,
      user_ip,
      aff_sub,
      aff_id: AFF_ID,

      // 🔴 only funnel name in sub3 now
      aff_sub3: FUNNEL_NAME,
    });

    if (country)  params.set("country", country);
    if (OFFER_ID) params.set("offer_id", OFFER_ID);

    // they can see the full page URL from this
    const referer = request.headers.get("Referer");
    if (referer) params.set("referer", referer);

    const apiUrl = `${API_URL}?${params.toString()}`;

    const apiResponse = await fetch(apiUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          request.headers.get("User-Agent") ||
          "Mozilla/5.0 (Windows NT 10.0; rv:100.0) Gecko/20100101 Firefox/100.0",
        "Accept-Language":
          request.headers.get("Accept-Language") || "de-DE,de;q=0.9,en;q=0.8",
      },
    });

    const text = await apiResponse.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return new Response(
        "API response is not JSON. Raw response:\n\n" + text,
        { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }

    if (!data.success) {
      return new Response(JSON.stringify(data, null, 2), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    const advertiserUrl = data.redirect;

    const thanksUrl = new URL("/thanks.html", url.origin);
    thanksUrl.searchParams.set("redirect", advertiserUrl);

    return Response.redirect(thanksUrl.toString(), 302);
  } catch (err) {
    return new Response("Internal error: " + err.message, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
