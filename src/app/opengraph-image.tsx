import { ImageResponse } from "next/og";

export const alt = "Nucleu — infrastructura care se demonstrează singură";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#0b0d11", color: "#eceae4", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eceae4", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: "#1f4be6" }} />
          </div>
          Nucleu
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>IT-ul care se repară singur.</div>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, color: "#7d9bff" }}>Și îți arată dovada.</div>
          <div style={{ fontSize: 26, color: "#aab0bc", marginTop: 12 }}>Riscul în lei · backup demonstrat · pleci oricând, cu tot · construit pentru 2126</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
