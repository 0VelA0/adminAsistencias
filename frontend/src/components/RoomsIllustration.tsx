export function RoomsIllustration() {
    return (
        <svg className="illustration" viewBox="0 0 220 140" aria-hidden="true">
            <circle className="ill-sun" cx="178" cy="30" r="10" />
            <rect className="ill-floor" x="18" y="118" width="184" height="4" rx="2" />
            <rect className="ill-door" x="58" y="30" width="62" height="88" rx="6" />
            <circle className="ill-knob" cx="110" cy="76" r="3" />
            <rect className="ill-board" x="134" y="54" width="52" height="34" rx="4" />
            <path className="ill-line" d="M142 64h30M142 72h20" />
            <rect className="ill-table" x="140" y="98" width="40" height="6" rx="3" />
            <path className="ill-line" d="M147 104v14M173 104v14" />
            <path className="ill-plant" d="M34 118c0-15 6-24 13-28-2 11 4 17 4 28" />
            <path className="ill-plant" d="M40 118c-1-9-6-15-12-17 3 7 3 12 3 17" />
        </svg>
    )
}