import { Dropdown } from '../Dropdown';
import type { QuestionInfo } from '../state/slices/error-slice';

interface QuestionPopoverProps {
    question: QuestionInfo;
    onAnswer: (answer: string) => void;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement | null>;
}

export function QuestionPopover({ question, onAnswer, onClose, anchorRef }: QuestionPopoverProps) {
    return (
        <Dropdown open={true} onClose={onClose} anchorRef={anchorRef} width={280}>
            <p className="px-2 pb-2 text-[11px] leading-5 text-[var(--cs-foreground)]">
                {question.question}
            </p>
            <div className="flex flex-col gap-1">
                {question.options.map((option) => (
                    <button
                        key={option}
                        type="button"
                        className="rounded-md px-2 py-1.5 text-left text-[11px] text-[var(--cs-foreground)] transition hover:bg-[var(--cs-feint)]"
                        onClick={() => onAnswer(option)}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </Dropdown>
    );
}
