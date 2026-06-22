import './globals.css';

export const metadata = {
  title: 'Leibinger → VideoJet Converter',
  description: 'Convert Leibinger .job files to VideoJet BMP — Tomco internal tool',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
