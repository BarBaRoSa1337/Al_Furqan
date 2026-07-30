import React from 'react';
import { render } from '@testing-library/react-native';
import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { getCoreLevelSteps } from '../../lib/content/lessonSteps';
import DailyLearningLoop, { scrollToStepTop } from './DailyLearningLoop';

test('renders package-authored step content with session progress', () => {
  const level = surahAlFilPackage.levels[0];
  const coreSteps = getCoreLevelSteps(level);
  const screen = render(
    <DailyLearningLoop
      level={level}
      step={coreSteps[0]}
      currentStepIndex={0}
      totalSteps={coreSteps.length}
      canProceed
      isLastStep={false}
      busy={false}
      continueLabel="Continue"
      checkLabel="Check Answer"
      completeLabel="Complete"
      exitLabel="Leave"
      onExit={jest.fn()}
      onAdvance={jest.fn()}
    />
  );

  const progress = screen.getByLabelText(`${level.title}: 1 / ${coreSteps.length}`);
  expect(progress.props.accessibilityRole).toBe('progressbar');
  expect(progress.props.accessibilityValue).toEqual({ min: 0, max: 100, now: Math.round(100 / coreSteps.length) });
  expect(screen.getByText(coreSteps[0].title)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
});

test('resets the lesson scroll position for a new step', () => {
  const scrollTo = jest.fn();

  scrollToStepTop({ scrollTo } as never);
  expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
});
