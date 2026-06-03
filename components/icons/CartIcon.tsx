export function CartIcon({ color = "currentColor", size = 22 }: { color?: string; size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24">
      <path d="M0 0h24v24H0z" fill="none" />
      <g fill="none" stroke={color} strokeWidth="1.5">
        <path strokeLinecap="round" d="m8 16l8.72-.727c2.729-.227 3.341-.823 3.643-3.544L21 6M6 6h16" />
        <circle cx="6" cy="20" r="2" />
        <circle cx="17" cy="20" r="2" />
        <path strokeLinecap="round" d="M8 20h7M2 2h.966c.945 0 1.768.625 1.997 1.515L7.94 15.076a1.96 1.96 0 0 1-.35 1.686L6.631 18" />
      </g>
    </svg>
  );
}
