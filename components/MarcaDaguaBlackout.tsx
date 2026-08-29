import Image from 'next/image'

export default function MarcaDaguaBlackout() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-20 hidden overflow-hidden md:left-64 md:block"
    >
      <div className="absolute left-1/2 top-[46%] h-[clamp(260px,42vw,560px)] w-[min(82vw,960px)] -translate-x-1/2 -translate-y-1/2">
        <Image
          src="/logo-blackout-clara.png"
          alt=""
          fill
          sizes="(max-width: 768px) 0px, 960px"
          className="translate-x-[5px] translate-y-[7px] select-none object-contain grayscale opacity-[0.025] brightness-50 blur-[1px]"
        />

        <Image
          src="/logo-blackout-clara.png"
          alt=""
          fill
          priority
          quality={100}
          sizes="(max-width: 768px) 0px, 960px"
          className="-translate-x-[2px] -translate-y-[2px] select-none object-contain grayscale opacity-[0.045] brightness-150 contrast-75 drop-shadow-[0_10px_14px_rgba(0,0,0,0.08)]"
        />
      </div>
    </div>
  )
}
