// Where the app's health numbers and advice come from (App Store 1.4.1): each
// topic lists its sources with a link. Citations stay in their original
// language (English); the topic names are translated.

export type SourceTopic = 'calories' | 'protein' | 'bmi' | 'water' | 'weight' | 'activity' | 'strength' | 'pregnancy' | 'fasting' | 'sleep' | 'food';

export interface Source { title: string; by: string; url: string }

export const SOURCES: Record<SourceTopic, Source[]> = {
    calories: [
        { title: 'A new predictive equation for resting energy expenditure in healthy individuals (Mifflin–St Jeor)', by: 'Mifflin MD, St Jeor ST, et al. Am J Clin Nutr, 1990', url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/' },
        { title: 'Dietary Guidelines for Americans, 2020–2025', by: 'U.S. Department of Agriculture and U.S. Department of Health and Human Services', url: 'https://www.dietaryguidelines.gov/' },
    ],
    protein: [
        { title: 'International Society of Sports Nutrition Position Stand: protein and exercise', by: 'Jäger R, et al. J Int Soc Sports Nutr, 2017', url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8' },
        { title: 'Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids', by: 'Institute of Medicine (National Academies), 2005', url: 'https://nap.nationalacademies.org/catalog/10490' },
    ],
    bmi: [
        { title: 'Adult BMI Categories', by: 'U.S. Centers for Disease Control and Prevention (CDC)', url: 'https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html' },
        { title: 'Obesity and overweight (fact sheet)', by: 'World Health Organization (WHO)', url: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight' },
    ],
    water: [
        { title: 'Dietary Reference Intakes for Water, Potassium, Sodium, Chloride, and Sulfate', by: 'National Academies of Sciences, Engineering, and Medicine, 2005', url: 'https://nap.nationalacademies.org/catalog/10925' },
        { title: 'Scientific Opinion on Dietary Reference Values for water', by: 'European Food Safety Authority (EFSA), 2010', url: 'https://www.efsa.europa.eu/en/efsajournal/pub/1459' },
    ],
    weight: [
        { title: 'Steps for Losing Weight', by: 'U.S. Centers for Disease Control and Prevention (CDC)', url: 'https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html' },
    ],
    activity: [
        { title: 'WHO guidelines on physical activity and sedentary behaviour', by: 'World Health Organization (WHO), 2020', url: 'https://www.who.int/publications/i/item/9789240015128' },
        { title: 'Daily steps and all-cause mortality: a meta-analysis of 15 international cohorts', by: 'Paluch AE, et al. Lancet Public Health, 2022', url: 'https://pubmed.ncbi.nlm.nih.gov/35247352/' },
    ],
    strength: [
        { title: 'Progression models in resistance training for healthy adults (position stand)', by: 'American College of Sports Medicine. Med Sci Sports Exerc, 2009', url: 'https://pubmed.ncbi.nlm.nih.gov/19204579/' },
        { title: 'Physical Activity Guidelines for Americans, 2nd edition', by: 'U.S. Department of Health and Human Services, 2018', url: 'https://odphp.health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines/current-guidelines' },
    ],
    pregnancy: [
        { title: 'Physical Activity and Exercise During Pregnancy and the Postpartum Period (Committee Opinion 804)', by: 'American College of Obstetricians and Gynecologists (ACOG), 2020', url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2020/04/physical-activity-and-exercise-during-pregnancy-and-the-postpartum-period' },
        { title: 'Pelvic floor exercises', by: 'National Health Service (NHS)', url: 'https://www.nhs.uk/pregnancy/keeping-well/pelvic-floor-exercises/' },
    ],
    fasting: [
        { title: 'Effects of Intermittent Fasting on Health, Aging, and Disease', by: 'de Cabo R, Mattson MP. N Engl J Med, 2019', url: 'https://www.nejm.org/doi/full/10.1056/NEJMra1905136' },
    ],
    sleep: [
        { title: 'Recommended Amount of Sleep for a Healthy Adult', by: 'American Academy of Sleep Medicine and Sleep Research Society. J Clin Sleep Med, 2015', url: 'https://jcsm.aasm.org/doi/10.5664/jcsm.4758' },
        { title: 'FastStats: Sleep in Adults', by: 'U.S. Centers for Disease Control and Prevention (CDC)', url: 'https://www.cdc.gov/sleep/data-research/facts-stats/adults-sleep-facts-and-stats.html' },
    ],
    food: [
        { title: 'FoodData Central', by: 'U.S. Department of Agriculture (USDA)', url: 'https://fdc.nal.usda.gov/' },
    ],
};

export const SOURCE_TOPICS = Object.keys(SOURCES) as SourceTopic[];
