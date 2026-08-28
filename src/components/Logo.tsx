export default function Logo({ className, rtl }: { className?: string; rtl?: boolean }) {
  return (
    <img
      src={rtl ? "/logo-rtl.svg" : "/logo.svg"}
      alt="Turkish Iraqi Gate For Importing And Procurement"
      className={className}
    />
  );
}
