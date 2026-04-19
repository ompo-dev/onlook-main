import { Dropdown } from '../Dropdown';
import styles from './QuestionPopover.module.css';

interface Question {
    question: string;
    options: string[];
}

interface QuestionPopoverProps {
    question: Question;
    onAnswer: (answer: string) => void;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement | null>;
}

export function QuestionPopover({ question, onAnswer, onClose, anchorRef }: QuestionPopoverProps) {
    return (
        <Dropdown open={true} onClose={onClose} anchorRef={anchorRef} width={280}>
            <p className={styles.question}>{question.question}</p>
            <div className={styles.options}>
                {question.options.map((option) => (
                    <button key={option} className={styles.option} onClick={() => onAnswer(option)}>
                        {option}
                    </button>
                ))}
            </div>
        </Dropdown>
    );
}
