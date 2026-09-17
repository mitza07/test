import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="num text-xs text-ink-3">404 · pagină inexistentă</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Nu există. Nici măcar în 2126.</h1>
      <p className="mx-auto mt-4 max-w-md text-ink-2">Linkul e greșit sau pagina s-a mutat. Ca orice incident, are un jurnal: l-am notat. Între timp, uite ce merge sigur.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="/">Acasă</Button>
        <Button href="/instrumente" variant="secondary">Instrumente gratuite</Button>
        <Link href="/contact" className="inline-flex h-11 items-center px-4 text-sm text-ink-2 hover:text-ink">Spune-ne ce căutai</Link>
      </div>
    </Container>
  );
}
