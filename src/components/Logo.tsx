import logoPng from '../assets/logo.png';
import { cn } from './ui';

export function Logo({ className }: { className?: string }) {
  return (
    <img 
      src={logoPng} 
      alt="Fyza" 
      className={cn("object-contain opacity-95", className)}
    />
  );
}
