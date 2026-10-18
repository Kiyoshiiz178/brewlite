export default async function Home() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`, {
    cache: 'no-store',
  });
  const data = await res.json();
  return <main className='p-6'>API: {data.status}</main>;
}
