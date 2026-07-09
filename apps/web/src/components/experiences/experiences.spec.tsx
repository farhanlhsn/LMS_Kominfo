import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CourseFeedbackSummary,
  CourseFeedbackWidget,
  ExperienceViews,
  FeedbackList,
  H5PLauncher,
  PollResultsView,
  PollsList,
  ScormLauncher,
  SurveyQuestionList,
  SurveyResponseList,
  SurveysList,
  XapiStatementList,
} from "./experiences-views";
import {
  feedbackAverage,
  feedbackStars,
  feedbackToneFor,
  formatPercent,
  isSurveyOpen,
  pollVotePercentage,
} from "./experiences-helpers";
import type {
  CourseFeedbackEntry,
  CourseFeedbackListResponse,
  Poll,
  PollResults,
  Survey,
  SurveyQuestion,
  SurveyResponse as SurveyResponseEntry,
  SurveyWithQuestions,
  XapiStatement,
} from "../../lib/lms-types";

describe("experiences-helpers", () => {
  it("computes percentage safely", () => {
    expect(formatPercent(0, 0)).toBe("0%");
    expect(formatPercent(25, 100)).toBe("25%");
    expect(formatPercent(1, 3)).toBe("33%");
  });

  it("returns 0 average when feedback is empty", () => {
    expect(feedbackAverage([])).toBe(0);
  });

  it("computes feedback average across items", () => {
    expect(
      feedbackAverage([
        { rating: 4 },
        { rating: 5 },
        { rating: 3 },
      ]),
    ).toBeCloseTo(4);
  });

  it("maps rating to feedback tone", () => {
    expect(feedbackToneFor(5)).toBe("success");
    expect(feedbackToneFor(3)).toBe("warning");
    expect(feedbackToneFor(1)).toBe("danger");
  });

  it("returns star visualization for ratings", () => {
    expect(feedbackStars(5)).toBe("★★★★★");
    expect(feedbackStars(3)).toBe("★★★☆☆");
  });

  it("treats published survey without closeAt as open", () => {
    expect(isSurveyOpen({ status: "PUBLISHED", closesAt: null })).toBe(true);
    expect(isSurveyOpen({ status: "DRAFT", closesAt: null })).toBe(false);
  });

  it("treats survey past closesAt as closed", () => {
    expect(
      isSurveyOpen({ status: "PUBLISHED", closesAt: new Date(2000, 0, 1).toISOString() }),
    ).toBe(false);
  });

  it("computes poll vote percentage", () => {
    const results: PollResults = {
      poll: {
        id: "p1",
        question: "Q?",
        options: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
        allowMultiple: false,
        anonymous: false,
        status: "ACTIVE",
        createdAt: "",
        updatedAt: "",
      },
      totalVotes: 4,
      options: [
        { id: "a", label: "A", votes: 3 },
        { id: "b", label: "B", votes: 1 },
      ],
    };
    expect(pollVotePercentage(results, "a")).toBe(75);
    expect(pollVotePercentage(results, "missing")).toBe(0);
    expect(pollVotePercentage(null, "a")).toBe(0);
  });
});

const sampleSurveys: Survey[] = [
  {
    id: "s1",
    title: "Course feedback",
    status: "PUBLISHED",
    anonymous: false,
    allowMultipleSubmissions: false,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    _count: { questions: 3, responses: 12 },
  },
  {
    id: "s2",
    title: "Closed survey",
    status: "CLOSED",
    anonymous: false,
    allowMultipleSubmissions: false,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-15T00:00:00.000Z",
  },
];

const samplePolls: Poll[] = [
  {
    id: "p1",
    question: "How is the lesson pace?",
    options: [
      { id: "fast", label: "Too fast" },
      { id: "ok", label: "Just right" },
      { id: "slow", label: "Too slow" },
    ],
    allowMultiple: false,
    anonymous: true,
    status: "ACTIVE",
    createdAt: "",
    updatedAt: "",
    _count: { votes: 25 },
  },
];

const sampleFeedback: CourseFeedbackEntry[] = [
  {
    id: "f1",
    courseId: "c1",
    rating: 5,
    comment: "Excellent",
    submittedAt: "2026-07-01T00:00:00.000Z",
    user: { id: "u1", name: "Ayu", email: "ayu@x.com" },
  },
  {
    id: "f2",
    courseId: "c1",
    rating: 3,
    comment: "Average",
    submittedAt: "2026-06-30T00:00:00.000Z",
    user: { id: "u2", name: "Budi", email: "budi@x.com" },
  },
];

const sampleSurveyQuestions: SurveyQuestion[] = [
  {
    id: "q1",
    surveyId: "s1",
    type: "SHORT_TEXT",
    prompt: "What did you enjoy?",
    required: true,
    orderIndex: 0,
    options: [],
    createdAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "q2",
    surveyId: "s1",
    type: "RATING",
    prompt: "Overall rating",
    required: false,
    orderIndex: 1,
    options: [],
    createdAt: "2026-07-01T00:00:00.000Z",
  },
];

const sampleSurvey: SurveyWithQuestions = {
  id: "s1",
  title: "Course feedback",
  status: "PUBLISHED",
  anonymous: false,
  allowMultipleSubmissions: false,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  questions: sampleSurveyQuestions,
};

const sampleSurveyResponses: SurveyResponseEntry[] = [
  {
    id: "r1",
    surveyId: "s1",
    user: { id: "u1", name: "Ayu", email: "ayu@x.com" },
    submittedAt: "2026-07-01T00:00:00.000Z",
    answers: [
      { id: "a1", responseId: "r1", questionId: "q1", value: "Great pacing" },
    ],
  },
];

const sampleXapi: XapiStatement[] = [
  {
    id: "x1",
    actor: { mbox: "mailto:a@b.com" },
    verb: { id: "http://adlnet.gov/expapi/verbs/experienced" },
    object: { id: "urn:lms:activity:1" },
    stored: "2026-07-01T00:00:00.000Z",
  },
];

describe("SurveysList", () => {
  it("renders empty state when no surveys", () => {
    const html = renderToStaticMarkup(createElement(SurveysList, { surveys: [] }));
    expect(html).toContain("No surveys yet");
  });

  it("renders survey rows with status badges", () => {
    const html = renderToStaticMarkup(createElement(SurveysList, { surveys: sampleSurveys }));
    expect(html).toContain("Course feedback");
    expect(html).toContain("3 questions");
    expect(html).toContain("12 responses");
    expect(html).toContain("OPEN");
  });
});

describe("SurveyQuestionList", () => {
  it("renders empty state when no questions", () => {
    const html = renderToStaticMarkup(createElement(SurveyQuestionList, { survey: null }));
    expect(html).toContain("No questions");
  });

  it("renders each question with prompt and required badge", () => {
    const html = renderToStaticMarkup(
      createElement(SurveyQuestionList, { survey: sampleSurvey }),
    );
    expect(html).toContain("What did you enjoy?");
    expect(html).toContain("Overall rating");
    expect(html).toContain("Required");
  });
});

describe("SurveyResponseList", () => {
  it("renders empty state when no responses", () => {
    const html = renderToStaticMarkup(createElement(SurveyResponseList, { responses: [] }));
    expect(html).toContain("No responses yet");
  });

  it("renders responses with user info and answer text", () => {
    const html = renderToStaticMarkup(
      createElement(SurveyResponseList, { responses: sampleSurveyResponses }),
    );
    expect(html).toContain("Ayu");
    expect(html).toContain("Great pacing");
  });
});

describe("PollsList", () => {
  it("renders empty state when no polls", () => {
    const html = renderToStaticMarkup(createElement(PollsList, { polls: [] }));
    expect(html).toContain("No polls yet");
  });

  it("renders poll rows with question and options count", () => {
    const html = renderToStaticMarkup(createElement(PollsList, { polls: samplePolls }));
    expect(html).toContain("How is the lesson pace?");
    expect(html).toContain("3 options");
    expect(html).toContain("25 votes");
  });
});

describe("PollResultsView", () => {
  it("renders empty state when no results", () => {
    const html = renderToStaticMarkup(createElement(PollResultsView, { results: null }));
    expect(html).toContain("No results");
  });

  it("renders results with bars and percentages", () => {
    const firstPoll = samplePolls[0];
    if (!firstPoll) throw new Error("missing sample poll");
    const results: PollResults = {
      poll: firstPoll,
      totalVotes: 4,
      options: [
        { id: "fast", label: "Too fast", votes: 1 },
        { id: "ok", label: "Just right", votes: 2 },
        { id: "slow", label: "Too slow", votes: 1 },
      ],
    };
    const html = renderToStaticMarkup(createElement(PollResultsView, { results }));
    expect(html).toContain("Just right");
    expect(html).toContain("50%");
    expect(html).toContain("4 total votes");
  });
});

describe("CourseFeedbackSummary", () => {
  it("renders empty state when no data", () => {
    const html = renderToStaticMarkup(createElement(CourseFeedbackSummary, { data: null }));
    expect(html).toContain("No feedback yet");
  });

  it("renders average rating and count", () => {
    const data: CourseFeedbackListResponse = {
      data: sampleFeedback,
      average: 4,
      totalFeedback: 2,
      meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
    };
    const html = renderToStaticMarkup(createElement(CourseFeedbackSummary, { data }));
    expect(html).toContain("4.0");
    expect(html).toContain("Ayu");
  });
});

describe("FeedbackList", () => {
  it("renders empty state", () => {
    const html = renderToStaticMarkup(createElement(FeedbackList, { items: [] }));
    expect(html).toContain("No feedback yet");
  });

  it("renders comment and rating badge", () => {
    const html = renderToStaticMarkup(createElement(FeedbackList, { items: sampleFeedback }));
    expect(html).toContain("Excellent");
    expect(html).toContain("5/5");
    expect(html).toContain("Average");
    expect(html).toContain("3/5");
  });
});

describe("CourseFeedbackWidget", () => {
  it("renders empty state for empty items", () => {
    const html = renderToStaticMarkup(createElement(CourseFeedbackWidget, { items: [] }));
    expect(html).toContain("No feedback for this course yet");
  });

  it("renders average and first few entries", () => {
    const html = renderToStaticMarkup(
      createElement(CourseFeedbackWidget, { items: sampleFeedback }),
    );
    expect(html).toContain("Ayu");
    expect(html).toContain("Budi");
  });
});

describe("XapiStatementList", () => {
  it("renders empty state", () => {
    const html = renderToStaticMarkup(createElement(XapiStatementList, { statements: [] }));
    expect(html).toContain("No xAPI statements yet");
  });

  it("renders statement verb and object id", () => {
    const html = renderToStaticMarkup(createElement(XapiStatementList, { statements: sampleXapi }));
    expect(html).toContain("experienced");
    expect(html).toContain("urn:lms:activity:1");
  });
});

describe("SCORM and H5P launchers", () => {
  it("renders SCORM launcher with version", () => {
    const html = renderToStaticMarkup(
      createElement(ScormLauncher, { title: "Module 1", version: "1.2" }),
    );
    expect(html).toContain("Module 1");
    expect(html).toContain("SCORM 1.2");
    expect(html).not.toContain("placeholder runtime");
  });

  it("renders SCORM entry URL link when provided", () => {
    const html = renderToStaticMarkup(
      createElement(ScormLauncher, {
        title: "Module 1",
        version: "2004",
        entryUrl: "https://example.com/launch",
      }),
    );
    expect(html).toContain("https://example.com/launch");
  });

  it("renders H5P launcher with library", () => {
    const html = renderToStaticMarkup(
      createElement(H5PLauncher, { title: "Quiz", library: "H5P.MultiChoice" }),
    );
    expect(html).toContain("Quiz");
    expect(html).toContain("H5P.MultiChoice");
    expect(html).not.toContain("placeholder runtime");
  });
});

describe("ExperienceViews namespace", () => {
  it("exports all expected views", () => {
    expect(typeof ExperienceViews).toBe("object");
    expect(typeof ExperienceViews.SurveysList).toBe("function");
    expect(typeof ExperienceViews.PollResultsView).toBe("function");
  });
});
