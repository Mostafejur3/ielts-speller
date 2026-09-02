import type { ReactNode, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function make(children: ReactNode, filled = false) {
  return function Icon({ size = 18, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? "currentColor" : "none"}
        stroke={filled ? "none" : "currentColor"}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {children}
      </svg>
    );
  };
}

export const IconDashboard = make(
  <>
    <rect x="3" y="3" width="7.5" height="8.5" rx="2" />
    <rect x="13.5" y="3" width="7.5" height="5" rx="2" />
    <rect x="3" y="14.5" width="7.5" height="6.5" rx="2" />
    <rect x="13.5" y="11" width="7.5" height="10" rx="2" />
  </>,
);

export const IconHeadphones = make(
  <>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <path d="M4 14h2.5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
    <path d="M20 14h-2.5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1H19a1 1 0 0 0 1-1z" />
  </>,
);

export const IconPen = make(
  <>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5z" />
  </>,
);

export const IconTarget = make(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" />
  </>,
);

export const IconRepeat = make(
  <>
    <path d="M17 2.5 20.5 6 17 9.5" />
    <path d="M3.5 12v-2a4 4 0 0 1 4-4h13" />
    <path d="M7 21.5 3.5 18 7 14.5" />
    <path d="M20.5 12v2a4 4 0 0 1-4 4h-13" />
  </>,
);

export const IconLibrary = make(
  <>
    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H9v18H5.5A1.5 1.5 0 0 1 4 19.5z" />
    <path d="M9 3h5.5A1.5 1.5 0 0 1 16 4.5v15a1.5 1.5 0 0 1-1.5 1.5H9" />
    <path d="m18.5 4.2 1.9 16" />
  </>,
);

export const IconBookmark = make(<path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4.2L5.5 20.5v-16a1 1 0 0 1 1-1z" />);

export const IconChart = make(
  <>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M8 17v-5" />
    <path d="M12.5 17V7" />
    <path d="M17 17v-8" />
  </>,
);

export const IconUpload = make(
  <>
    <path d="M12 16V4" />
    <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
    <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
  </>,
);

export const IconSettings = make(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 14.6H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9.3A1.6 1.6 0 0 0 10.4 3.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.1a2 2 0 1 1 0 4H21a1.6 1.6 0 0 0-1.5 1z" />
  </>,
);

export const IconSpeaker = make(
  <>
    <path d="M11 5 6.5 8.8H3.5v6.4h3L11 19z" />
    <path d="M15.2 9.2a4 4 0 0 1 0 5.6" />
    <path d="M18 6.4a8 8 0 0 1 0 11.2" />
  </>,
);

export const IconSpeakerOff = make(
  <>
    <path d="M11 5 6.5 8.8H3.5v6.4h3L11 19z" />
    <path d="m16 10 4 4" />
    <path d="m20 10-4 4" />
  </>,
);

export const IconKeyboard = make(
  <>
    <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
    <path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M8 14h8" />
  </>,
);

export const IconCheck = make(<path d="m4.5 12.5 5 5 10-11" />);

export const IconX = make(
  <>
    <path d="m6 6 12 12" />
    <path d="m18 6-12 12" />
  </>,
);

export const IconChevronLeft = make(<path d="m14.5 5-7 7 7 7" />);
export const IconChevronRight = make(<path d="m9.5 5 7 7-7 7" />);
export const IconChevronDown = make(<path d="m5 9.5 7 7 7-7" />);

export const IconPlus = make(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>,
);

export const IconTrash = make(
  <>
    <path d="M4 7h16" />
    <path d="M9.5 7V4.8A1 1 0 0 1 10.5 4h3a1 1 0 0 1 1 .8V7" />
    <path d="M6.5 7 7.4 20a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9L17.5 7" />
    <path d="M10.5 11v6M13.5 11v6" />
  </>,
);

export const IconPencil = make(
  <>
    <path d="M4 20.5h4l11-11a2.5 2.5 0 0 0-3.5-3.5l-11 11z" />
    <path d="m14.5 6.5 3 3" />
  </>,
);

export const IconSearch = make(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </>,
);

export const IconSun = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
  </>,
);

export const IconMoon = make(<path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2" />);

export const IconFlame = make(
  <>
    <path d="M12 21c4 0 6.5-2.6 6.5-6 0-4.3-4-5.6-4-9.5-2.6 1-4 3.2-4 5.3 0 1.3-1 1.7-1.7.9-.4-.5-.6-1.2-.6-1.9C6.6 11 5.5 12.4 5.5 15c0 3.4 2.5 6 6.5 6" />
  </>,
);

export const IconCommand = make(
  <path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z" />,
);

export const IconEye = make(
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12" />
    <circle cx="12" cy="12" r="3" />
  </>,
);

export const IconEyeOff = make(
  <>
    <path d="M10.6 6.1A8.9 8.9 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.3 4" />
    <path d="M6.4 7.7A16.7 16.7 0 0 0 2.5 12S6 18 12 18a9.4 9.4 0 0 0 4-.9" />
    <path d="m9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m4 4 16 16" />
  </>,
);

export const IconShuffle = make(
  <>
    <path d="M17 3.5 20.5 7 17 10.5" />
    <path d="M3.5 7h4c2 0 3 1.3 4.2 3.2" />
    <path d="M14 14c1 1.6 2 2.8 3.5 2.8h3" />
    <path d="M17 13.5 20.5 17 17 20.5" />
    <path d="M3.5 17h4c1.3 0 2.3-.6 3.2-1.6" />
  </>,
);

export const IconFolder = make(
  <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z" />,
);

export const IconList = make(
  <>
    <path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12" />
    <path d="M4 6.5h.01M4 12h.01M4 17.5h.01" />
  </>,
);

export const IconAlert = make(
  <>
    <path d="M12 4.5 21 19.5H3z" />
    <path d="M12 10v4M12 17h.01" />
  </>,
);

export const IconClock = make(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>,
);

export const IconPlay = make(<path d="M7 4.8 19 12 7 19.2z" />, true);

export const IconPause = make(
  <>
    <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
    <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
  </>,
);

export const IconSpark = make(
  <>
    <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9z" />
    <path d="M18.5 16.5 19.2 19l2.3.8-2.3.8-.7 2.4" />
  </>,
);

export const IconArrowRight = make(
  <>
    <path d="M4 12h15" />
    <path d="m13.5 6.5 6 5.5-6 5.5" />
  </>,
);

export const IconFilter = make(<path d="M3.5 5.5h17l-6.6 7.7v5.6l-3.8 2v-7.6z" />);

export const IconDownload = make(
  <>
    <path d="M12 4v11" />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    <path d="M4 19h16" />
  </>,
);
