interface ImportMeta {
  glob?: (
    pattern: string,
    options: {
      eager: true;
      import: "default";
      query: string;
    },
  ) => Record<string, string>;
  env?: {
    AI_PRODUCT_QUEST_ROOT?: string;
  };
}
