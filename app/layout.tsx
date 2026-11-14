import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'ReturnReady Utah — Your next chapter starts here',description:'Discover the skills you already have, find flexible opportunities, and build your return-to-work plan.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
