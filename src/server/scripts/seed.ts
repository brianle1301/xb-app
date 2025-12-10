import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/xb-app";

// Helper to add _id to overviews and tasks when inserting
function prepareExperimentForInsert(experiment: {
  name: { en: string; es: string };
  description: { en: string; es: string };
  boxId: ObjectId;
  overviews?: unknown[];
  days: { dayNumber: number; tasks: unknown[] }[];
}) {
  return {
    ...experiment,
    overviews: experiment.overviews?.map((o) => ({
      ...(o as Record<string, unknown>),
      _id: new ObjectId(),
    })),
    days: experiment.days.map((day) => ({
      ...day,
      tasks: day.tasks.map((t) => ({
        ...(t as Record<string, unknown>),
        _id: new ObjectId(),
      })),
    })),
  };
}

// Reusable overview definitions
const overviews = {
  sleepScience: {
    title: {
      en: "The Science of Sleep",
      es: "La ciencia del sueño",
    },
    thumbnail:
      "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&h=300&fit=crop",
    blocks: [
      {
        type: "markdown" as const,
        content: {
          en: `# The Science of Sleep

Sleep is one of the most important factors in your overall health and well-being.

## Why Sleep Matters

During sleep, your body:
- Repairs muscles and tissues
- Consolidates memories
- Releases important hormones
- Strengthens the immune system

## The Sleep Cycle

A complete sleep cycle lasts about 90 minutes and includes:
1. **Light Sleep (N1)** - The transition from wakefulness
2. **Light Sleep (N2)** - Body temperature drops, heart rate slows
3. **Deep Sleep (N3)** - The most restorative stage
4. **REM Sleep** - When most dreaming occurs

![Sleep Cycles](https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800)

Most adults need 7-9 hours of sleep per night to complete 4-6 full cycles.`,
          es: `# La ciencia del sueño

El sueño es uno de los factores más importantes para tu salud y bienestar general.

## Por qué el sueño importa

Durante el sueño, tu cuerpo:
- Repara músculos y tejidos
- Consolida memorias
- Libera hormonas importantes
- Fortalece el sistema inmunológico

## El ciclo del sueño

Un ciclo de sueño completo dura aproximadamente 90 minutos e incluye:
1. **Sueño ligero (N1)** - La transición desde la vigilia
2. **Sueño ligero (N2)** - La temperatura corporal baja, el ritmo cardíaco disminuye
3. **Sueño profundo (N3)** - La etapa más restauradora
4. **Sueño REM** - Cuando ocurren la mayoría de los sueños

![Ciclos del sueño](https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800)

La mayoría de los adultos necesitan 7-9 horas de sueño por noche para completar 4-6 ciclos completos.`,
        },
      },
    ],
  },
  sleepTips: {
    title: {
      en: "Sleep Hygiene Tips",
      es: "Consejos de higiene del sueño",
    },
    thumbnail:
      "https://images.unsplash.com/photo-1515894203077-9cd36032142f?w=400&h=300&fit=crop",
    blocks: [
      {
        type: "markdown" as const,
        content: {
          en: `# Sleep Hygiene Tips

Good sleep hygiene can dramatically improve your sleep quality.

## Environment
- Keep your bedroom cool (65-68°F / 18-20°C)
- Use blackout curtains or an eye mask
- Consider white noise or earplugs

## Before Bed
- Avoid screens 1 hour before sleep
- No caffeine after 2pm
- Limit alcohol consumption

## Daily Habits
- Get morning sunlight exposure
- Exercise regularly (but not too close to bedtime)
- Maintain consistent sleep/wake times`,
          es: `# Consejos de higiene del sueño

Una buena higiene del sueño puede mejorar dramáticamente la calidad de tu sueño.

## Ambiente
- Mantén tu habitación fresca (18-20°C)
- Usa cortinas opacas o un antifaz
- Considera ruido blanco o tapones para los oídos

## Antes de dormir
- Evita pantallas 1 hora antes de dormir
- Sin cafeína después de las 2pm
- Limita el consumo de alcohol

## Hábitos diarios
- Exponte a la luz solar por la mañana
- Haz ejercicio regularmente (pero no muy cerca de la hora de dormir)
- Mantén horarios consistentes de sueño/vigilia`,
        },
      },
    ],
  },
  hydrationBenefits: {
    title: {
      en: "Benefits of Hydration",
      es: "Beneficios de la hidratación",
    },
    thumbnail:
      "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=300&fit=crop",
    blocks: [
      {
        type: "markdown" as const,
        content: {
          en: `# Why Hydration Matters

Water is essential for nearly every function in your body.

## Key Benefits
- **Energy**: Even mild dehydration can cause fatigue
- **Brain Function**: Proper hydration improves focus and concentration
- **Digestion**: Water helps break down food and absorb nutrients
- **Skin Health**: Hydration keeps skin elastic and glowing
- **Joint Health**: Water lubricates and cushions joints

## How Much Water?

A general guideline is 8 glasses (64 oz / 2 liters) per day, but needs vary based on:
- Activity level
- Climate
- Body size
- Overall health

![Water](https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800)`,
          es: `# Por qué importa la hidratación

El agua es esencial para casi todas las funciones de tu cuerpo.

## Beneficios clave
- **Energía**: Incluso la deshidratación leve puede causar fatiga
- **Función cerebral**: La hidratación adecuada mejora el enfoque y la concentración
- **Digestión**: El agua ayuda a descomponer los alimentos y absorber nutrientes
- **Salud de la piel**: La hidratación mantiene la piel elástica y brillante
- **Salud articular**: El agua lubrica y amortigua las articulaciones

## ¿Cuánta agua?

Una guía general es 8 vasos (2 litros) por día, pero las necesidades varían según:
- Nivel de actividad
- Clima
- Tamaño corporal
- Salud general

![Agua](https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800)`,
        },
      },
    ],
  },
  movementBenefits: {
    title: {
      en: "Why Movement Matters",
      es: "Por qué el movimiento importa",
    },
    thumbnail:
      "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&h=300&fit=crop",
    blocks: [
      {
        type: "markdown" as const,
        content: {
          en: `# The Power of Daily Movement

Regular physical activity is one of the best things you can do for your health.

## Physical Benefits
- Strengthens heart and lungs
- Builds and maintains muscle
- Improves flexibility and balance
- Supports healthy weight

## Mental Benefits
- Reduces stress and anxiety
- Improves mood through endorphin release
- Enhances cognitive function
- Promotes better sleep

## Getting Started

You don't need intense workouts to see benefits. Simple activities like:
- Walking
- Stretching
- Dancing
- Gardening

Can all contribute to better health!

![Exercise](https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800)`,
          es: `# El poder del movimiento diario

La actividad física regular es una de las mejores cosas que puedes hacer por tu salud.

## Beneficios físicos
- Fortalece el corazón y los pulmones
- Construye y mantiene músculo
- Mejora la flexibilidad y el equilibrio
- Apoya un peso saludable

## Beneficios mentales
- Reduce el estrés y la ansiedad
- Mejora el estado de ánimo mediante la liberación de endorfinas
- Mejora la función cognitiva
- Promueve un mejor sueño

## Cómo empezar

No necesitas entrenamientos intensos para ver beneficios. Actividades simples como:
- Caminar
- Estirar
- Bailar
- Jardinería

¡Todas pueden contribuir a una mejor salud!

![Ejercicio](https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800)`,
        },
      },
    ],
  },
};

// Reusable task definitions
const tasks = {
  setBedtime: {
    name: {
      en: "Set a consistent bedtime",
      es: "Establece una hora de dormir consistente",
    },
    icon: "⏰",
    blocks: [
      {
        type: "markdown" as const,
        content: {
          en: `# Set Your Bedtime

Choose a bedtime that allows for 7-9 hours of sleep before you need to wake up.

## Why This Matters
Consistent sleep schedules help regulate your circadian rhythm, making it easier to fall asleep and wake up naturally.

## Your Task Today
1. Calculate your ideal bedtime based on your wake-up time
2. Set an alarm reminder 30 minutes before bed
3. Start winding down when the alarm goes off

![Sleep Schedule](https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800)

## Video Guide
Watch this quick guide on setting up your sleep schedule:

https://www.youtube.com/watch?v=nm1TxQj9IsQ`,
          es: `# Establece tu hora de dormir

Elige una hora de dormir que permita 7-9 horas de sueño antes de que necesites despertar.

## Por qué esto importa
Los horarios de sueño consistentes ayudan a regular tu ritmo circadiano, facilitando dormir y despertar naturalmente.

## Tu tarea de hoy
1. Calcula tu hora ideal de dormir basándote en tu hora de despertar
2. Configura una alarma de recordatorio 30 minutos antes de dormir
3. Comienza a relajarte cuando suene la alarma

![Horario de Sueño](https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800)

## Guía en Video
Mira esta guía rápida sobre cómo configurar tu horario de sueño:

https://www.youtube.com/watch?v=nm1TxQj9IsQ`,
        },
      },
    ],
  },
  bedtimeRoutine: {
    name: {
      en: "Create a bedtime routine",
      es: "Crea una rutina antes de dormir",
    },
    icon: "🧘",
    blocks: [
      {
        type: "markdown" as const,
        content: {
          en: `# Build Your Wind-Down Routine

A consistent pre-sleep routine signals your body it's time to rest.

## Suggested Activities
- Light stretching or yoga
- Reading a book
- Meditation or breathing exercises
- Gentle music

Avoid screens for at least 30 minutes before bed!`,
          es: `# Construye tu rutina de relajación

Una rutina constante antes de dormir señala a tu cuerpo que es hora de descansar.

## Actividades sugeridas
- Estiramientos ligeros o yoga
- Leer un libro
- Meditación o ejercicios de respiración
- Música suave

¡Evita las pantallas al menos 30 minutos antes de dormir!`,
        },
      },
      {
        type: "input" as const,
        id: "activities",
        inputType: "textarea",
        label: {
          en: "What activities did you do tonight?",
          es: "¿Qué actividades hiciste esta noche?",
        },
        placeholder: {
          en: "e.g., Read for 20 minutes, did 10 minutes of stretching...",
          es: "ej., Leí por 20 minutos, hice 10 minutos de estiramiento...",
        },
        required: false,
      },
    ],
  },
  trackWater: {
    name: {
      en: "Track your water intake",
      es: "Rastrea tu consumo de agua",
    },
    icon: "💧",
    blocks: [
      {
        type: "markdown" as const,
        content: {
          en: `# Stay Hydrated

Aim to drink at least 8 glasses of water today.

## Benefits
- Improved energy levels
- Better digestion
- Clearer skin
- Enhanced cognitive function

Keep a water bottle with you throughout the day!`,
          es: `# Mantente hidratado

Intenta beber al menos 8 vasos de agua hoy.

## Beneficios
- Niveles de energía mejorados
- Mejor digestión
- Piel más clara
- Función cognitiva mejorada

¡Mantén una botella de agua contigo durante el día!`,
        },
      },
      {
        type: "select" as const,
        id: "glasses",
        label: {
          en: "How many glasses did you drink today?",
          es: "¿Cuántos vasos bebiste hoy?",
        },
        helpText: {
          en: "1 glass = approximately 250ml",
          es: "1 vaso = aproximadamente 250ml",
        },
        required: true,
        options: [
          { value: "1-2", label: { en: "1-2 glasses", es: "1-2 vasos" } },
          { value: "3-4", label: { en: "3-4 glasses", es: "3-4 vasos" } },
          { value: "5-6", label: { en: "5-6 glasses", es: "5-6 vasos" } },
          { value: "7-8", label: { en: "7-8 glasses", es: "7-8 vasos" } },
          { value: "8+", label: { en: "8+ glasses", es: "8+ vasos" } },
        ],
      },
    ],
  },
  addVegetables: {
    name: {
      en: "Add vegetables to every meal",
      es: "Agrega vegetales a cada comida",
    },
    icon: "🥦",
    blocks: [
      {
        type: "markdown" as const,
        content: {
          en: `# Eat More Vegetables

Try to include vegetables in breakfast, lunch, and dinner today.

## Easy Ideas
- Add spinach to your morning eggs
- Have a side salad with lunch
- Include roasted vegetables with dinner

![Colorful Vegetables](https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800)`,
          es: `# Come más vegetales

Intenta incluir vegetales en el desayuno, almuerzo y cena hoy.

## Ideas fáciles
- Agrega espinacas a tus huevos de la mañana
- Acompaña el almuerzo con una ensalada
- Incluye vegetales asados con la cena

![Vegetales coloridos](https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800)`,
        },
      },
    ],
  },
  morningStretch: {
    name: {
      en: "Morning stretch routine",
      es: "Rutina de estiramiento matutino",
    },
    icon: "🤸",
    blocks: [
      {
        type: "markdown" as const,
        content: {
          en: `# Morning Stretches

Start your day with a 10-minute stretch routine.

## Follow Along
Watch this beginner-friendly morning stretch routine:

https://www.youtube.com/watch?v=g_tea8ZNk5A

## Benefits
- Increased flexibility
- Better circulation
- Reduced morning stiffness
- Improved mood`,
          es: `# Estiramientos matutinos

Comienza tu día con una rutina de estiramiento de 10 minutos.

## Sigue junto
Mira esta rutina de estiramiento matutino amigable para principiantes:

https://www.youtube.com/watch?v=g_tea8ZNk5A

## Beneficios
- Mayor flexibilidad
- Mejor circulación
- Rigidez matutina reducida
- Estado de ánimo mejorado`,
        },
      },
    ],
  },
  takeWalk: {
    name: {
      en: "Take a 20-minute walk",
      es: "Camina por 20 minutos",
    },
    icon: "🚶",
    blocks: [
      {
        type: "markdown" as const,
        content: {
          en: `# Daily Walk

Get outside and take a 20-minute walk today.

## Tips
- Walk at a comfortable pace
- Focus on your breathing
- Observe your surroundings
- Listen to music or a podcast if you like

Fresh air and movement are great for both body and mind!

![Walking](https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800)`,
          es: `# Caminata diaria

Sal y camina por 20 minutos hoy.

## Consejos
- Camina a un ritmo cómodo
- Concéntrate en tu respiración
- Observa tu entorno
- Escucha música o un podcast si te gusta

¡El aire fresco y el movimiento son excelentes para el cuerpo y la mente!

![Caminando](https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800)`,
        },
      },
    ],
  },
};

async function seed() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();

    // Clear existing data
    await Promise.all([
      db.collection("boxes").deleteMany({}),
      db.collection("experiments").deleteMany({}),
      db.collection("journalentries").deleteMany({}),
      db.collection("subscriptions").deleteMany({}),
      db.collection("taskcompletions").deleteMany({}),
    ]);
    console.log("Cleared existing data");

    // Create Boxes
    const boxesCol = db.collection("boxes");
    const sleepBoxResult = await boxesCol.insertOne({
      name: { en: "Sleep", es: "Dormir" },
      description: {
        en: "Improve your sleep quality and establish better sleep habits",
        es: "Mejora la calidad de tu sueño y establece mejores hábitos de sueño",
      },
      thumbnail: "🌙",
      order: 1,
    });

    const eatBoxResult = await boxesCol.insertOne({
      name: { en: "Eat", es: "Comer" },
      description: {
        en: "Develop healthier eating habits and nutrition awareness",
        es: "Desarrolla hábitos alimenticios más saludables y conciencia nutricional",
      },
      thumbnail: "🥗",
      order: 2,
    });

    const moveBoxResult = await boxesCol.insertOne({
      name: { en: "Move", es: "Moverse" },
      description: {
        en: "Build a sustainable exercise routine and stay active",
        es: "Construye una rutina de ejercicio sostenible y mantente activo",
      },
      thumbnail: "🏃",
      order: 3,
    });

    console.log("Created boxes");

    // Create Experiments with inlined tasks
    const experimentsCol = db.collection("experiments");

    await experimentsCol.insertOne(
      prepareExperimentForInsert({
        name: { en: "Better Sleep in 5 Days", es: "Mejor sueño en 5 días" },
        description: {
          en: "Establish healthy sleep habits through consistent routines",
          es: "Establece hábitos de sueño saludables a través de rutinas consistentes",
        },
        boxId: sleepBoxResult.insertedId,
        overviews: [overviews.sleepScience, overviews.sleepTips],
        days: [
          { dayNumber: 1, tasks: [tasks.setBedtime] },
          { dayNumber: 2, tasks: [tasks.setBedtime, tasks.bedtimeRoutine] },
          { dayNumber: 3, tasks: [tasks.bedtimeRoutine] },
          { dayNumber: 4, tasks: [tasks.setBedtime, tasks.bedtimeRoutine] },
          { dayNumber: 5, tasks: [tasks.bedtimeRoutine] },
        ],
      })
    );

    await experimentsCol.insertOne(
      prepareExperimentForInsert({
        name: { en: "Hydration Challenge", es: "Desafío de hidratación" },
        description: {
          en: "Build the habit of drinking enough water daily",
          es: "Construye el hábito de beber suficiente agua diariamente",
        },
        boxId: eatBoxResult.insertedId,
        overviews: [overviews.hydrationBenefits],
        days: [
          { dayNumber: 1, tasks: [tasks.trackWater] },
          { dayNumber: 2, tasks: [tasks.trackWater] },
          { dayNumber: 3, tasks: [tasks.trackWater] },
          { dayNumber: 4, tasks: [tasks.trackWater] },
          { dayNumber: 5, tasks: [tasks.trackWater] },
        ],
      })
    );

    await experimentsCol.insertOne(
      prepareExperimentForInsert({
        name: { en: "Veggie Boost", es: "Impulso vegetal" },
        description: {
          en: "Increase your daily vegetable intake",
          es: "Aumenta tu consumo diario de vegetales",
        },
        boxId: eatBoxResult.insertedId,
        days: [
          { dayNumber: 1, tasks: [tasks.addVegetables] },
          { dayNumber: 2, tasks: [tasks.addVegetables] },
          { dayNumber: 3, tasks: [tasks.addVegetables] },
          { dayNumber: 4, tasks: [tasks.addVegetables] },
          { dayNumber: 5, tasks: [tasks.addVegetables] },
        ],
      })
    );

    await experimentsCol.insertOne(
      prepareExperimentForInsert({
        name: { en: "Morning Movement", es: "Movimiento matutino" },
        description: {
          en: "Start your day with energizing movement",
          es: "Comienza tu día con movimiento energizante",
        },
        boxId: moveBoxResult.insertedId,
        overviews: [overviews.movementBenefits],
        days: [
          { dayNumber: 1, tasks: [tasks.morningStretch] },
          { dayNumber: 2, tasks: [tasks.morningStretch, tasks.takeWalk] },
          { dayNumber: 3, tasks: [tasks.morningStretch] },
          { dayNumber: 4, tasks: [tasks.takeWalk] },
          { dayNumber: 5, tasks: [tasks.morningStretch, tasks.takeWalk] },
        ],
      })
    );

    console.log("Created experiments");

    // Create subscriptions in "offered" state for all experiments
    // This uses a test user ID - in production, subscriptions are created per-user
    const TEST_USER_ID = "test-user-123";
    const allExperiments = await experimentsCol.find({}).toArray();
    const subscriptionsCol = db.collection("subscriptions");
    const now = new Date();

    for (const experiment of allExperiments) {
      await subscriptionsCol.insertOne({
        userId: TEST_USER_ID,
        experimentId: experiment._id,
        status: "offered",
        offeredAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log(
      `Created ${allExperiments.length} subscriptions in "offered" state for test user`
    );

    console.log("✅ Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
