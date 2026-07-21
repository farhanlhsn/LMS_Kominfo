import { describe, expect, it } from "vitest";
import { csvToQuestions, parseCsv, questionsToCsv } from "./question-csv";
import type { Question } from "./lms-types";

describe("question-csv", () => {
  it("round-trips short answer and mc", () => {
    const questions: Question[] = [
      {
        id: "1",
        questionBankId: "b",
        type: "SHORT_ANSWER",
        prompt: 'What is "Paris"?',
        points: 2,
        acceptedAnswers: ["Paris", "paris"],
        options: [],
      },
      {
        id: "2",
        questionBankId: "b",
        type: "MULTIPLE_CHOICE",
        prompt: "Pick A",
        points: 1,
        options: [
          { id: "o1", text: "A", isCorrect: true, orderIndex: 0 },
          { id: "o2", text: "B", isCorrect: false, orderIndex: 1 },
        ],
      },
    ];
    const csv = questionsToCsv(questions);
    const rows = csvToQuestions(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.type).toBe("SHORT_ANSWER");
    expect(rows[0]?.acceptedAnswers).toEqual(["Paris", "paris"]);
    expect(rows[1]?.options?.[0]?.isCorrect).toBe(true);
    expect(rows[1]?.options?.[0]?.text).toBe("A");
  });

  it("parses quoted commas", () => {
    const rows = parseCsv('a,"b,c",d\n1,"2,3",4\n');
    expect(rows[1]).toEqual(["1", "2,3", "4"]);
  });
});
