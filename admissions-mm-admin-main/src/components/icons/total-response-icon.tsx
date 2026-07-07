import React from "react";

export function TotalResponseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_958_151)">
        <path d="M7.5 18V13.5H12V18H7.5ZM9 15V16.5H10.5V15H9ZM12 6V10.5H7.5V6H12ZM10.5 9V7.5H9V9H10.5ZM16.5 7.5V9H13.5V7.5H16.5ZM3 0H21V24H6.39844L7.89844 22.5H19.5V1.5H4.5V14.6016L3.78516 13.8867L3 14.6602V0ZM13.5 16.5V15H16.5V16.5H13.5ZM9 21H2.92969L4.83984 22.9102L3.78516 23.9648L0.0703125 20.25L3.78516 16.5352L4.83984 17.5898L2.92969 19.5H9V21Z" fill="currentColor"/>
      </g>
      <defs>
        <clipPath id="clip0_958_151">
          <rect width="24" height="24" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
}
