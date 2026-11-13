import type { IconName } from '../types';
import Icon from './Icon';

interface DesktopIconProps {
  icon: IconName;
  label: string;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}

/** One click selects, a click on a selected icon (or Enter) opens it, so a double-click works too. */
export default function DesktopIcon({ icon, label, selected, onSelect, onOpen }: DesktopIconProps) {
  return (
    <button
      type="button"
      data-desktop-icon
      className="group flex w-[84px] flex-col items-center gap-1 p-1 text-center text-white focus:outline-none"
      onClick={() => (selected ? onOpen() : onSelect())}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <span className={selected ? 'opacity-80' : ''}>
        <Icon name={icon} size={32} />
      </span>
      <span
        className={`px-[3px] leading-[13px] group-focus-visible:outline group-focus-visible:outline-1 group-focus-visible:outline-dotted group-focus-visible:outline-white ${
          selected ? 'bg-win-title outline outline-1 outline-dotted outline-white' : ''
        }`}
        style={selected ? undefined : { textShadow: '1px 1px #000' }}
      >
        {label}
      </span>
    </button>
  );
}
