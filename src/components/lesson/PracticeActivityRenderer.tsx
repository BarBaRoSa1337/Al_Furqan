import type { ExerciseSubmissionResult, LearningActivity } from '../../types/activities';
import LearningActivityRenderer from './LearningActivityRenderer';
import RecallThenRevealActivity from './RecallThenRevealActivity';

interface Props {
  activity: LearningActivity;
  onAnswer: (answer: unknown, correct: boolean) => Promise<ExerciseSubmissionResult>;
}

export default function PracticeActivityRenderer({ activity, onAnswer }: Props) {
  return activity.kind === 'recall_then_reveal'
    ? <RecallThenRevealActivity activity={activity} onAnswer={onAnswer} />
    : <LearningActivityRenderer activity={activity} onAnswer={onAnswer} />;
}
