import mongoose from "mongoose";

import {
  Box,
  Experiment,
  JournalEntry,
  Subscription,
  TaskCompletion,
} from "../db/models";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/xb-app";

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
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing data
    await Promise.all([
      Box.deleteMany({}),
      Experiment.deleteMany({}),
      JournalEntry.deleteMany({}),
      Subscription.deleteMany({}),
      TaskCompletion.deleteMany({}),
    ]);
    console.log("Cleared existing data");

    // Create Boxes
    const sleepBox = await Box.create({
      name: { en: "Sleep", es: "Dormir" },
      description: {
        en: "Improve your sleep quality and establish better sleep habits",
        es: "Mejora la calidad de tu sueño y establece mejores hábitos de sueño",
      },
      thumbnail: "🌙",
      order: 1,
    });

    const eatBox = await Box.create({
      name: { en: "Eat", es: "Comer" },
      description: {
        en: "Develop healthier eating habits and nutrition awareness",
        es: "Desarrolla hábitos alimenticios más saludables y conciencia nutricional",
      },
      thumbnail: "🥗",
      order: 2,
    });

    const moveBox = await Box.create({
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
    const sleepExp1 = await Experiment.create({
      name: { en: "Better Sleep in 5 Days", es: "Mejor sueño en 5 días" },
      description: {
        en: "Establish healthy sleep habits through consistent routines",
        es: "Establece hábitos de sueño saludables a través de rutinas consistentes",
      },
      boxId: sleepBox._id,
      days: [
        { dayNumber: 1, tasks: [tasks.setBedtime] },
        { dayNumber: 2, tasks: [tasks.setBedtime, tasks.bedtimeRoutine] },
        { dayNumber: 3, tasks: [tasks.bedtimeRoutine] },
        { dayNumber: 4, tasks: [tasks.setBedtime, tasks.bedtimeRoutine] },
        { dayNumber: 5, tasks: [tasks.bedtimeRoutine] },
      ],
    });

    const eatExp1 = await Experiment.create({
      name: { en: "Hydration Challenge", es: "Desafío de hidratación" },
      description: {
        en: "Build the habit of drinking enough water daily",
        es: "Construye el hábito de beber suficiente agua diariamente",
      },
      boxId: eatBox._id,
      days: [
        { dayNumber: 1, tasks: [tasks.trackWater] },
        { dayNumber: 2, tasks: [tasks.trackWater] },
        { dayNumber: 3, tasks: [tasks.trackWater] },
        { dayNumber: 4, tasks: [tasks.trackWater] },
        { dayNumber: 5, tasks: [tasks.trackWater] },
      ],
    });

    const eatExp2 = await Experiment.create({
      name: { en: "Veggie Boost", es: "Impulso vegetal" },
      description: {
        en: "Increase your daily vegetable intake",
        es: "Aumenta tu consumo diario de vegetales",
      },
      boxId: eatBox._id,
      days: [
        { dayNumber: 1, tasks: [tasks.addVegetables] },
        { dayNumber: 2, tasks: [tasks.addVegetables] },
        { dayNumber: 3, tasks: [tasks.addVegetables] },
        { dayNumber: 4, tasks: [tasks.addVegetables] },
        { dayNumber: 5, tasks: [tasks.addVegetables] },
      ],
    });

    const moveExp1 = await Experiment.create({
      name: { en: "Morning Movement", es: "Movimiento matutino" },
      description: {
        en: "Start your day with energizing movement",
        es: "Comienza tu día con movimiento energizante",
      },
      boxId: moveBox._id,
      days: [
        { dayNumber: 1, tasks: [tasks.morningStretch] },
        { dayNumber: 2, tasks: [tasks.morningStretch, tasks.takeWalk] },
        { dayNumber: 3, tasks: [tasks.morningStretch] },
        { dayNumber: 4, tasks: [tasks.takeWalk] },
        { dayNumber: 5, tasks: [tasks.morningStretch, tasks.takeWalk] },
      ],
    });

    console.log("Created experiments");

    // Note: User-specific data (subscriptions, journal entries, task completions)
    // will be created when users sign up and interact with the app.
    console.log("✅ Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
