export {
  ActionButton as Action_Button,
  EditIcon as Edit_Icon,
  MoreIcon as More_Icon,
  PowerIcon as Power_Icon,
  TrashIcon as Trash_Icon,
  ViewIcon as View_Icon,
} from "@datapromr/action-button";

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>);

}

export function Chevron_Icon() {
  return (
    <Icon>
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>);

}

export function Clock_Icon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Icon>);

}

export function Tag_Icon() {
  return (
    <Icon>
      <path d="M4 12.5 12.5 4h6.5v6.5L11 19.5 4 12.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="16.2" cy="7.8" r="1.1" fill="currentColor" />
    </Icon>);

}

export function Link_Icon() {
  return (
    <Icon>
      <path d="M10 13.5 8.5 15A3.5 3.5 0 1 1 3.5 10L5 8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 10.5 15.5 9A3.5 3.5 0 1 1 20.5 14L19 15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m9.5 14.5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Icon>);

}
