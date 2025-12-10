import { MongoClient, ObjectId } from "mongodb";

import experimentsData from "../../../experiments.json";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/xb-app";

// Define old schema types
interface OldBlock {
  blockId: string;
  type: "markdown" | "video";
  content?: string;
  src?: string;
}

interface OldSection {
  sectionTitle: string;
  sectionImageSrc?: string;
  sectionContent: OldBlock[];
}

interface OldTask {
  taskId: string;
  type: string;
  name: string;
  icon: string;
  disabled: boolean;
  isRepeatable: boolean;
  minOccurences?: { $numberInt: string };
  blocks: OldBlock[];
}

interface OldDay {
  dayId: string;
  description?: string;
  disabled: boolean;
  tasks: OldTask[];
}

interface OldExperiment {
  _id: { $oid: string };
  name: string;
  boxId: string;
  boxweek: { $numberInt: string };
  desc: OldSection[];
  shouldSendReminders: boolean;
  days: OldDay[];
  id: string;
}

// Convert video block to YouTube markdown
function videoToMarkdown(src: string): string {
  // Video src is typically like: "ZQdoCjOpFtQ?si=FEdwmu9k_M_4bGre"
  // Extract just the video ID (before the ?)
  const videoId = src.split("?")[0].replace(/"/g, "");
  return `\n\n📺 **Watch the video:** [https://www.youtube.com/watch?v=${videoId}](https://www.youtube.com/watch?v=${videoId})\n\n`;
}

// Convert old section to new overview format
function convertSectionToOverview(section: OldSection) {
  // Combine all content blocks into one markdown block
  let combinedContent = "";

  for (const block of section.sectionContent) {
    if (block.type === "markdown" && block.content) {
      combinedContent += block.content + "\n\n";
    } else if (block.type === "video" && block.src) {
      combinedContent += videoToMarkdown(block.src);
    }
  }

  // Skip empty sections
  if (!combinedContent.trim()) {
    return null;
  }

  // Get thumbnail image URL based on section title
  const thumbnail = getThumbnailForSection(section.sectionTitle);

  return {
    _id: new ObjectId(),
    title: {
      en: section.sectionTitle,
      es: section.sectionTitle, // Keep English for now, can be translated later
    },
    thumbnail,
    blocks: [
      {
        type: "markdown" as const,
        content: {
          en: combinedContent.trim(),
          es: combinedContent.trim(), // Keep English for now
        },
      },
    ],
  };
}

// Get thumbnail image URL based on section title content
function getThumbnailForSection(title: string): string {
  const titleLower = title.toLowerCase();

  // Sleep/darkness related
  if (titleLower.includes("dark") || titleLower.includes("sleep"))
    return "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&h=300&fit=crop";

  // Daylight/light related
  if (titleLower.includes("daylight") || titleLower.includes("light"))
    return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop";

  // Movement/exercise related
  if (titleLower.includes("move") || titleLower.includes("floor") || titleLower.includes("shift"))
    return "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&h=300&fit=crop";

  // Breathing related
  if (titleLower.includes("breath"))
    return "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop";

  // Walking related
  if (titleLower.includes("walk"))
    return "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=400&h=300&fit=crop";

  // Snacking/food related
  if (titleLower.includes("snack") || titleLower.includes("eat") || titleLower.includes("full"))
    return "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400&h=300&fit=crop";

  // Green/red foods (vegetables/nutrition)
  if (titleLower.includes("green") || titleLower.includes("red"))
    return "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop";

  // Satiety/fullness
  if (titleLower.includes("satiety") || titleLower.includes("satisfaction") || titleLower.includes("scent"))
    return "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop";

  // Knowledge/science related
  if (titleLower.includes("knowledge") || titleLower.includes("science") || titleLower.includes("background"))
    return "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=300&fit=crop";

  // Lab/setup related
  if (titleLower.includes("lab") || titleLower.includes("set up") || titleLower.includes("skill"))
    return "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=300&fit=crop";

  // Focus/experiment related
  if (titleLower.includes("focus") || titleLower.includes("experiment"))
    return "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=300&fit=crop";

  // Resources/practice related
  if (titleLower.includes("resource") || titleLower.includes("practice"))
    return "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=400&h=300&fit=crop";

  // Default fallback
  return "https://images.unsplash.com/photo-1493836512294-502baa1986e2?w=400&h=300&fit=crop";
}

// Get Lucide icon name based on task name
function getIconForTask(icon: string, name: string): string {
  // Map old icon names to Lucide icons
  if (icon === "note-pencil") return "pencil";

  // Derive from task name
  const nameLower = name.toLowerCase();
  if (nameLower.includes("log") || nameLower.includes("book"))
    return "notebook-pen";
  if (nameLower.includes("walk")) return "footprints";
  if (nameLower.includes("breath")) return "wind";
  if (nameLower.includes("move") || nameLower.includes("floor")) return "move";
  if (nameLower.includes("micro")) return "scan";
  if (nameLower.includes("eat") || nameLower.includes("meal"))
    return "utensils";
  if (nameLower.includes("sleep")) return "moon";
  if (nameLower.includes("observation") || nameLower.includes("experience"))
    return "eye";
  return "check-circle";
}

// Type definitions for parsed blocks
type ParsedBlock =
  | { type: "markdown"; content: { en: string; es: string } }
  | {
      type: "input";
      id: string;
      inputType: "text" | "textarea";
      label: { en: string; es: string };
      placeholder?: { en: string; es: string };
      required: boolean;
    }
  | {
      type: "select";
      id: string;
      label: { en: string; es: string };
      options: { value: string; label: { en: string; es: string } }[];
      required: boolean;
    };

// Generate a unique ID from label text
function generateId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 30);
}

// Parse select-input pattern: >>> select-input >> "Label" >> "opt1", "opt2", ...
// Also handles: >>> Select-input>> "Label">> "opt1", "opt2"
function parseSelectInput(line: string): ParsedBlock | null {
  // Match various forms of select-input syntax
  const selectMatch = line.match(
    />>>\s*[Ss]elect(?:or)?-input\s*>>\s*(.+?)\s*>>\s*(.+)/i
  );
  if (!selectMatch) return null;

  let label = selectMatch[1].trim().replace(/^["']|["']$/g, "").replace(/:+$/, "");
  const optionsStr = selectMatch[2];

  // Parse options - they can be quoted strings separated by commas
  const options: { value: string; label: { en: string; es: string } }[] = [];
  const optionMatches = optionsStr.match(/"[^"]+"/g);
  if (optionMatches) {
    for (const opt of optionMatches) {
      const value = opt.replace(/^"|"$/g, "").trim();
      if (value && !value.startsWith("**")) {
        // Skip markdown bold markers
        options.push({
          value: value.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          label: { en: value, es: value },
        });
      }
    }
  }

  if (options.length === 0) return null;

  return {
    type: "select",
    id: generateId(label),
    label: { en: label, es: label },
    options,
    required: false,
  };
}

// Parse slider-input pattern: >>> slider-input >> min, max >> value1, "label1", value2, "label2"
// For now, convert to select with the labeled options
function parseSliderInput(line: string, contextLabel: string): ParsedBlock | null {
  const sliderMatch = line.match(
    />>>\s*slider-input\s*>>\s*(\d+)\s*,\s*(\d+)\s*>>\s*(.+)/i
  );
  if (!sliderMatch) return null;

  const optionsStr = sliderMatch[3];

  // Parse options - format: value, "label", value, "label", ...
  const options: { value: string; label: { en: string; es: string } }[] = [];

  // Extract all quoted strings as labels
  const labelMatches = optionsStr.match(/"[^"]+"/g);
  if (labelMatches) {
    labelMatches.forEach((label, index) => {
      const labelText = label.replace(/^"|"$/g, "").trim();
      if (labelText) {
        options.push({
          value: String(index + 1),
          label: { en: labelText, es: labelText },
        });
      }
    });
  }

  if (options.length === 0) return null;

  // Use the context label (text before the >>> on the same line or nearby)
  const label = contextLabel || "Rating";

  return {
    type: "select",
    id: generateId(label),
    label: { en: label, es: label },
    options,
    required: false,
  };
}

// Parse text-input pattern: >>> text-input >> "Label/placeholder"
function parseTextInput(line: string): ParsedBlock | null {
  const textMatch = line.match(/>>>\s*text-input\s*>>\s*"([^"]+)"/i);
  if (!textMatch) return null;

  const label = textMatch[1].trim();

  return {
    type: "input",
    id: generateId(label),
    inputType: label.length > 50 ? "textarea" : "text",
    label: { en: label, es: label },
    required: false,
  };
}

// Parse markdown content and extract input blocks
function parseContentWithInputs(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = content.split("\n");
  let currentMarkdown = "";
  let lastNonInputLine = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check for input patterns
    if (trimmedLine.includes(">>>")) {
      // Save any accumulated markdown first
      if (currentMarkdown.trim()) {
        blocks.push({
          type: "markdown",
          content: { en: currentMarkdown.trim(), es: currentMarkdown.trim() },
        });
        currentMarkdown = "";
      }

      // Try parsing different input types
      let inputBlock: ParsedBlock | null = null;

      if (/select(?:or)?-input/i.test(trimmedLine)) {
        inputBlock = parseSelectInput(trimmedLine);
      } else if (/slider-input/i.test(trimmedLine)) {
        // Use the text before >>> as the label context
        const beforeInput = trimmedLine.split(">>>")[0].trim();
        const contextLabel =
          beforeInput.replace(/[:#*]+$/, "").trim() || lastNonInputLine.replace(/[:#*]+$/, "").trim();
        inputBlock = parseSliderInput(trimmedLine, contextLabel);
      } else if (/text-input/i.test(trimmedLine)) {
        inputBlock = parseTextInput(trimmedLine);
      }

      if (inputBlock) {
        blocks.push(inputBlock);
      }
    } else {
      // Regular markdown line
      currentMarkdown += line + "\n";
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        lastNonInputLine = trimmedLine;
      }
    }
  }

  // Don't forget remaining markdown
  if (currentMarkdown.trim()) {
    blocks.push({
      type: "markdown",
      content: { en: currentMarkdown.trim(), es: currentMarkdown.trim() },
    });
  }

  return blocks;
}

// Convert old task to new task format
function convertTask(oldTask: OldTask) {
  // Parse all blocks and extract inputs
  const allBlocks: ParsedBlock[] = [];

  for (const block of oldTask.blocks) {
    if (block.type === "video" && block.src) {
      allBlocks.push({
        type: "markdown",
        content: {
          en: videoToMarkdown(block.src),
          es: videoToMarkdown(block.src),
        },
      });
    } else if (block.content) {
      // Parse content for embedded inputs
      const parsedBlocks = parseContentWithInputs(block.content);
      allBlocks.push(...parsedBlocks);
    }
  }

  // Deduplicate block IDs by appending index if needed
  const usedIds = new Set<string>();
  const blocks = allBlocks.map((b, index) => {
    if (b.type === "select" || b.type === "input") {
      let id = b.id;
      if (usedIds.has(id)) {
        id = `${id}-${index}`;
      }
      usedIds.add(id);
      return { ...b, id };
    }
    return b;
  });

  return {
    _id: new ObjectId(),
    name: {
      en: oldTask.name,
      es: oldTask.name, // Keep English for now
    },
    icon: getIconForTask(oldTask.icon, oldTask.name),
    blocks,
  };
}

// Convert old experiment to new format
function convertExperiment(
  oldExp: OldExperiment,
  boxIdMap: Record<string, unknown>
) {
  // Determine which box this belongs to
  const nameLower = oldExp.name.toLowerCase();
  let boxKey: "move" | "eat" | "sleep" = "move";
  if (nameLower.startsWith("eat")) boxKey = "eat";
  else if (nameLower.startsWith("sleep")) boxKey = "sleep";

  // Convert desc sections to overviews
  const overviews = oldExp.desc
    .map(convertSectionToOverview)
    .filter((o) => o !== null);

  // Convert days
  let days = oldExp.days.map((day, index) => ({
    dayNumber: index + 1,
    tasks: day.tasks.map(convertTask),
  }));

  // If only 1 day, duplicate to 5 days
  if (days.length === 1) {
    const singleDay = days[0];
    days = [1, 2, 3, 4, 5].map((dayNum) => ({
      dayNumber: dayNum,
      tasks: singleDay.tasks,
    }));
  }

  // Extract description from the first overview if available
  let description = oldExp.name;
  if (overviews.length > 0 && overviews[0]?.blocks?.[0]?.content?.en) {
    // Take first 200 chars of first overview as description
    const firstContent = overviews[0].blocks[0].content.en;
    const firstParagraph = firstContent.split("\n\n")[0].replace(/^#+\s*/, "");
    description =
      firstParagraph.length > 200
        ? firstParagraph.substring(0, 200) + "..."
        : firstParagraph;
  }

  return {
    name: {
      en: oldExp.name,
      es: oldExp.name, // Keep English for now
    },
    description: {
      en: description,
      es: description, // Keep English for now
    },
    boxId: boxIdMap[boxKey],
    overviews,
    days,
  };
}

async function migrate() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();

    // Clear existing experiments only (keep boxes)
    await db.collection("experiments").deleteMany({});
    console.log("Cleared existing experiments");

    // Get or create boxes
    const boxesCol = db.collection("boxes");
    let moveBox = await boxesCol.findOne({ "name.en": "Move" });
    let eatBox = await boxesCol.findOne({ "name.en": "Eat" });
    let sleepBox = await boxesCol.findOne({ "name.en": "Sleep" });

    // Create boxes if they don't exist
    if (!moveBox) {
      const result = await boxesCol.insertOne({
        name: { en: "Move", es: "Moverse" },
        description: {
          en: "Build a sustainable exercise routine and stay active",
          es: "Construye una rutina de ejercicio sostenible y mantente activo",
        },
        thumbnail: "🏃",
        order: 1,
      });
      moveBox = { _id: result.insertedId };
      console.log("Created Move box");
    }

    if (!eatBox) {
      const result = await boxesCol.insertOne({
        name: { en: "Eat", es: "Comer" },
        description: {
          en: "Develop healthier eating habits and nutrition awareness",
          es: "Desarrolla hábitos alimenticios más saludables y conciencia nutricional",
        },
        thumbnail: "🥗",
        order: 2,
      });
      eatBox = { _id: result.insertedId };
      console.log("Created Eat box");
    }

    if (!sleepBox) {
      const result = await boxesCol.insertOne({
        name: { en: "Sleep", es: "Dormir" },
        description: {
          en: "Improve your sleep quality and establish better sleep habits",
          es: "Mejora la calidad de tu sueño y establece mejores hábitos de sueño",
        },
        thumbnail: "🌙",
        order: 3,
      });
      sleepBox = { _id: result.insertedId };
      console.log("Created Sleep box");
    }

    const boxIdMap = {
      move: moveBox._id,
      eat: eatBox._id,
      sleep: sleepBox._id,
    };

    console.log("Box IDs:", boxIdMap);

    // Convert and insert experiments
    const experimentsCol = db.collection("experiments");
    const experiments = experimentsData as OldExperiment[];
    const insertedExperimentIds: ObjectId[] = [];

    for (const oldExp of experiments) {
      const newExp = convertExperiment(oldExp, boxIdMap);
      const result = await experimentsCol.insertOne(newExp);
      insertedExperimentIds.push(result.insertedId as ObjectId);
      console.log(`Migrated: ${oldExp.name}`);
    }

    // Clear existing subscriptions and create new ones for all users
    const subscriptionsCol = db.collection("subscriptions");
    await subscriptionsCol.deleteMany({});

    // Get all existing users and create subscriptions for them
    const usersCol = db.collection("user");
    const users = await usersCol.find({}).toArray();
    const now = new Date();

    for (const user of users) {
      for (const experimentId of insertedExperimentIds) {
        await subscriptionsCol.insertOne({
          userId: user.id,
          experimentId,
          status: "offered",
          offeredAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
      console.log(`Created ${insertedExperimentIds.length} subscriptions for user: ${user.email}`);
    }

    console.log(`\n✅ Migration complete! Migrated ${experiments.length} experiments.`);
    console.log(`Created subscriptions for ${users.length} users.`);
    process.exit(0);
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migrate();
