import Create from "@/components/Create";

export default function Home() {
  return (
    <div className="fade-in">
      <section className="py-8 text-center sm:py-14">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
          ¿Dónde los <span className="bg-gradient-to-r from-red-600 via-gray-400 to-blue-600 bg-clip-text text-transparent">colocarías</span>?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
          Crea una campaña, comparte el enlace y descubre cómo se posiciona un grupo de personas sobre el arco ideológico. Sin registros.
        </p>
      </section>
      <Create />
    </div>
  );
}
