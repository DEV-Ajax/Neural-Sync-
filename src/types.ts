export interface Flashcard {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  concept_tag: string;
  // SRS data
  repetition_number: number;
  easiness_factor: number;
  interval: number;
  next_review_date: string;
}

export interface ConceptNode {
  id: string;
  label: string;
  unlocked: boolean;
}

export interface ConceptLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: ConceptNode[];
  links: ConceptLink[];
}
