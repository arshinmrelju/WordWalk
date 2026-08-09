/**
 * Word Walk — Educational Dictionary Module (dictionary.js)
 * Provides instant, curated definitions for all faith & Bible
 * vocabulary terms in Word Walk.
 */

'use strict';

const WORD_DEFINITIONS = {
    // ── Faith & Virtues ──
    'FAITH': 'Confident trust and belief in God and His promises (Hebrews 11:1).',
    'HOPE': 'A confident expectation of good from God through Christ (Romans 15:13).',
    'LOVE': 'The greatest virtue — selfless, sacrificial love modeled by Christ (1 Corinthians 13:13).',
    'GRACE': 'Unmerited favor and love freely given by God (Ephesians 2:8).',
    'MERCY': 'Compassionate kindness withheld from what is deserved (Lamentations 3:22-23).',
    'PEACE': 'Tranquility and wholeness that come from God (John 14:27).',
    'JOY': 'Deep gladness and contentment rooted in God (Galatians 5:22).',
    'PRAISE': 'Expressions of honor, worship, and thanksgiving to God (Psalm 150).',
    'WORSHIP': 'Reverent devotion and honor offered to God in spirit and truth (John 4:24).',
    'PRAYER': 'Conversation and communion with God (Philippians 4:6).',
    'BLESSING': 'A gift of God\'s favor and goodness (Numbers 6:24-26).',
    'SALVATION': 'Deliverance from sin and eternal life through Jesus Christ (John 3:16).',
    'REDEMPTION': 'The buying back of sinners through Christ\'s sacrifice (Ephesians 1:7).',
    'FORGIVENESS': 'Releasing someone from guilt; granted freely by God (1 John 1:9).',
    'COVENANT': 'A sacred agreement or promise between God and His people (Genesis 9:13).',
    'GOSPEL': 'The good news of salvation through Jesus Christ (Mark 1:15).',
    'SCRIPTURE': 'The inspired writings of the Holy Bible (2 Timothy 3:16).',
    'PARABLE': 'A story with a spiritual lesson taught by Jesus (Luke 15).',
    'MIRACLE': 'A supernatural act revealing God\'s power (John 2:11).',
    'HEAVEN': 'The eternal dwelling place of God and the redeemed (Revelation 21:4).',
    'SERMON': 'A teaching or proclamation of God\'s Word (Matthew 5-7).',
    'TRINITY': 'The one God in three persons: Father, Son, and Holy Spirit (Matthew 28:19).',
    'SHEPHERD': 'One who cares for sheep; a title for God and Jesus (Psalm 23:1).',
    'DISCIPLE': 'A follower and learner of Jesus Christ (Luke 14:27).',
    'APOSTLE': 'One sent forth; the chosen witnesses of Jesus (Luke 6:13).',
    'TESTIMONY': 'A personal witness to the goodness and work of God (Acts 1:8).',
    'BAPTISM': 'The sacrament of initiation into Christ through water (Matthew 3:16).',
    'WISDOM': 'The fear of the Lord — the foundation of true understanding (Proverbs 9:10).',
    'HUMILITY': 'Recognizing our need for God; honoring others first (Philippians 2:3).',
    'GENTLENESS': 'A fruit of the Spirit — strength under control (Galatians 5:23).',
    'PATIENCE': 'Endurance and long-suffering; a fruit of the Spirit (Galatians 5:22).',
    'GOODNESS': 'Moral excellence flowing from God\'s character (Galatians 5:22).',
    'KINDNESS': 'Compassionate, gracious treatment of others (Colossians 3:12).',
    'ETERNITY': 'Endless existence with God — our eternal hope (Ecclesiastes 3:11).',
    'HOLINESS': 'Being set apart for God; reflecting His character (1 Peter 1:16).',
    'SANCTUARY': 'A holy place set apart for the worship of God (Exodus 25:8).',
    'VIRTUE': 'Moral excellence and uprightness of character (Philippians 4:8).',
    'REVIVAL': 'A renewed outpouring of spiritual life and zeal (Psalm 85:6).',
    'FAITHFUL': 'Loyal and steadfast; true to God\'s calling (Lamentations 3:23).',
    'DEVOTION': 'Wholehearted dedication to God (Acts 2:42).',
    'COMMUNION': 'Fellowship with God and the body of Christ (1 Corinthians 10:16).',
    'CHARITY': 'Selfless, unconditional love in action (1 Corinthians 13:4).',

    // ── People of the Bible ──
    'JESUS': 'The Son of God and Savior of the world (Luke 2:11).',
    'MARY': 'The mother of Jesus, full of grace (Luke 1:28-30).',
    'MOSES': 'God\'s chosen leader who delivered Israel from Egypt (Exodus 3:10).',
    'DAVID': 'A man after God\'s own heart; king of Israel (1 Samuel 13:14).',
    'PAUL': 'Apostle to the Gentiles; author of many New Testament letters (Acts 9:15).',
    'PETER': 'Chief apostle who denied and then followed Jesus (Matthew 16:18).',
    'NOAH': 'Righteous man who built the ark by faith (Genesis 6:8-9).',
    'JONAH': 'Prophet swallowed by a great fish (Jonah 1:17).',
    'ABRAHAM': 'Father of faith; patriarch of Israel (Genesis 12:2).',
    'JOSEPH': 'Dreamer and servant who rose to lead Egypt (Genesis 41:41).',
    'ELIJAH': 'Prophet who confronted the prophets of Baal (1 Kings 18).',
    'ISAIAH': 'Major prophet who foretold the coming Messiah (Isaiah 7:14).',
    'DANIEL': 'Prophet of integrity who trusted God in the lion\'s den (Daniel 6).',
    'SOLOMON': 'The wise king who built the temple (1 Kings 3:12).',
    'RUTH': 'Faithful Moabite woman, ancestor of Jesus (Ruth 1:16).',
    'ESTHER': 'Courageous queen who saved her people (Esther 4:14).',
    'JOHN': 'Beloved disciple who wrote the fourth Gospel (John 21:24).',
    'LUKE': 'Physician and author of the Gospel of Luke & Acts (Colossians 4:14).',
    'MARK': 'Author of the earliest Gospel (Acts 12:12).',
    'STEPHEN': 'The first martyr of the early Church (Acts 7:59-60).',
    'TIMOTHY': 'Young pastor mentored by Paul (1 Timothy 4:12).',

    // ── Places & Events ──
    'NAZARETH': 'The hometown of Jesus (Luke 2:39).',
    'BETHLEHEM': 'The town of David; birthplace of Jesus (Micah 5:2).',
    'GALILEE': 'The region where Jesus grew up and ministered (Matthew 4:15).',
    'JORDAN': 'The river where Jesus was baptized (Matthew 3:13).',
    'JERUSALEM': 'The holy city of God\'s temple (Psalm 122:6).',
    'CALVARY': 'The hill where Jesus was crucified (Luke 23:33).',
    'GOLGOTHA': 'Aramaic name for the place of the skull (John 19:17).',
    'PENTECOST': 'The day the Holy Spirit filled the Church (Acts 2).',
    'GABRIEL': 'The angel who announced the birth of Jesus (Luke 1:26-28).',
    'MICHAEL': 'An archangel in Scripture (Jude 1:9).',
    'EDEN': 'The garden where God placed the first humans (Genesis 2:8).',
    'CANA': 'The village where Jesus\' first miracle turned water to wine (John 2:11).',

    // ── General & Theme Words ──
    'JOURNEY': 'A long passage from one place to another; the walk of life.',
    'WALK': 'To move on foot; the daily walk of faith (Micah 6:8).',
    'PATH': 'A way or course of life (Psalm 16:11).',
    'RIVER': 'A flowing stream of water — a symbol of life (Psalm 46:4).',
    'MOUNTAIN': 'A high elevation — a place of encounter with God (Exodus 19).',
    'LAMP': 'A light that guides one\'s steps (Psalm 119:105).',
    'CROSS': 'The symbol of Christ\'s sacrifice and our salvation (Galatians 6:14).',
    'CROWN': 'A symbol of kingship and eternal reward (2 Timothy 4:8).',
    'VINE': 'A climbing plant — Jesus is the true vine (John 15:1).',
    'BRANCH': 'A shoot of the vine; believers abide in Christ (John 15:5).',
    'HARVEST': 'The gathering of crops — an image of the Kingdom (Matthew 9:37).',
    'VINEYARD': 'A plantation of grapevines — an image of God\'s people (Isaiah 5:7).',
    'SEED': 'The beginning of life — the Word of God sown (Matthew 13).',
    'ROCK': 'A firm foundation; a name for Christ (Matthew 7:24).',
    'SHIELD': 'Protection — faith is our shield (Ephesians 6:16).',
    'SWORD': 'A weapon — the Word of God (Ephesians 6:17).',
    'ARMOR': 'Spiritual protection given by God (Ephesians 6:11).',
    'THRONE': 'The seat of God\'s sovereign authority (Psalm 103:19).',
    'PSALM': 'A sacred song of praise in the Bible (Psalm 1).',
    'PROVERB': 'A short saying of wisdom (Proverbs 1:1).',
    'STONE': 'A rock used in building — Christ the cornerstone (1 Peter 2:4).',
    'DOOR': 'An entrance — Jesus is the door to salvation (John 10:9).',
    'GATE': 'An opening — enter through the narrow gate (Matthew 7:13).',
    'LIGHT': 'The life and truth of Christ in a dark world (John 8:12).',
    'TRUTH': 'Reality grounded in God — Jesus is the Truth (John 14:6).',
    'STAR': 'A heavenly body — the Star of Bethlehem (Matthew 2:2).',
    'FIELD': 'An open land — the field of God\'s harvest (Matthew 13:38).',
    'SHEEP': 'An animal of the flock — God\'s people (Psalm 100:3).',
    'LAMB': 'A young sheep — Jesus, the Lamb of God (John 1:29).',
    'KINGDOM': 'The reign of God — the Kingdom of Heaven (Matthew 6:33).'
};

/**
 * Clean & Format Word for Display
 * Example: 'JESUS' -> 'Jesus', 'BETHLEHEM' -> 'Bethlehem'
 */
function formatWordForDisplay(word) {
    if (!word) return '';
    const clean = word.trim().toUpperCase();
    return clean.charAt(0) + clean.slice(1).toLowerCase();
}

/**
 * Retrieve Definition for a word (Local lookup first, with online fallback)
 * @param {string} rawWord 
 * @returns {Promise<{wordDisplay: string, definition: string}>}
 */
async function getWordDefinition(rawWord) {
    if (!rawWord) return { wordDisplay: '', definition: 'No definition available.' };

    const cleanKey = rawWord.trim().toUpperCase();
    const display = formatWordForDisplay(cleanKey);

    // 1. Direct local dictionary match
    if (WORD_DEFINITIONS[cleanKey]) {
        return {
            wordDisplay: display,
            definition: WORD_DEFINITIONS[cleanKey]
        };
    }

    // 2. Try online Free Dictionary API as fallback for admin/custom words
    try {
        const queryTerm = rawWord.toLowerCase().replace(/[^a-z]/g, '');
        if (queryTerm.length >= 2) {
            const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(queryTerm)}`);
            if (resp.ok) {
                const data = await resp.json();
                const mean = data[0]?.meanings[0]?.definitions[0]?.definition;
                if (mean) {
                    return {
                        wordDisplay: display,
                        definition: mean
                    };
                }
            }
        }
    } catch (e) {
        // Fallback silently if offline or API fails
    }

    // 3. Fallback definition generator if dictionary and API missed
    return {
        wordDisplay: display,
        definition: `A featured term in Word Walk. Discover its usage and context in scripture!`
    };
}

// Export to global scope
window.WORD_DEFINITIONS = WORD_DEFINITIONS;
window.formatWordForDisplay = formatWordForDisplay;
window.getWordDefinition = getWordDefinition;
