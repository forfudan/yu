export interface Question {
    title: string;
    description?: string;
    yesText?: string;
    noText?: string;
    // 如果有这些字段，则根据答案显示不同的下一个问题
    yesNext?: Question;
    noNext?: Question;
}

export interface Result {
    name: string;
    description?: string;
    features?: string[];
    link?: string;
}
