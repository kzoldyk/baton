/** Shared shadcn-style motion class fragments. */
export const motion = {
  overlay:
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200",
  dialog:
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200",
  sheet:
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300 ease-out",
  tooltip:
    "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150",
  press: "transition-transform duration-150 active:scale-[0.98]",
  surface: "transition-colors duration-200",
  chevron: "transition-transform duration-200",
  fadeIn: "animate-in fade-in-0 duration-200"
} as const;
