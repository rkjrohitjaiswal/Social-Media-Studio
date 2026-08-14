import {
  SocialPlatform,
  ContentType,
  GeneratePlatformContentInput,
  PlatformContentData,
} from "@ai-social/shared";
import { validatePlatformContent } from "./content-validator";

export function generatePlatformContent(
  input: GeneratePlatformContentInput
): Partial<PlatformContentData> & { validation?: ReturnType<typeof validatePlatformContent> } {
  const { platform, contentType, sourceData, brand, assetUrl } = input;
  const brandName = brand?.name || "Our Brand";

  let caption = "";
  let title = "";
  let description = "";
  let hashtags: string[] = [];
  let keywords: string[] = [];
  let cta = brand?.defaultCta || "Learn more";
  let altText = "";
  let destinationUrl = "";
  let platformMetadata: Record<string, unknown> = {};

  // Extract source data components safely
  const aff = sourceData?.affiliate;
  const cert = sourceData?.certification;
  const teach = sourceData?.teaching;
  const gen = sourceData?.general;

  // Enforce Affiliate disclosure rule: AI must never invent prices/claims
  const affiliateDisclosure = aff?.disclosure || "Disclosure: This post contains affiliate links. #ad #affiliate";

  switch (platform) {
    case "INSTAGRAM": {
      if (contentType === "AFFILIATE_PRODUCT" && aff) {
        caption = `Elevate your workflow with ${aff.productName}. ${aff.keyFeatures?.join(". ") || ""}\n\n${affiliateDisclosure}`;
        hashtags = ["#AffiliateFinds", "#ProductReview", "#MustHave", "#QualityFirst"];
        cta = "Tap the link in bio to shop now!";
      } else if (contentType === "CERTIFICATION" && cert) {
        caption = `Proud to share that I've officially achieved the ${cert.certificationName} certification from ${cert.issuingOrganization}! 🎓\n\nKey skills mastered: ${cert.skillsLearned?.join(", ") || "Advanced techniques"}.`;
        hashtags = ["#Achievement", "#CareerGrowth", "#LifelongLearning", "#Certification"];
        cta = "Read my reflection on the journey below.";
      } else if (contentType === "TEACHING" && teach) {
        caption = `💡 Quick Masterclass: ${teach.topic}\n\n${teach.learningObjective || "Key insights to upgrade your skills."}\n\nKey Takeaways:\n${teach.keyPoints?.map((p) => `• ${p}`).join("\n") || "• Continuous improvement\n• Practical implementation"}`;
        hashtags = ["#Education", "#LearnToCode", "#TechTips", "#KnowledgeSharing"];
        cta = "Save this post for later reference!";
      } else {
        caption = `Visual excellence curated for ${brandName}. Elegant craftsmanship in every detail.`;
        hashtags = [`#${brandName.replace(/\s+/g, "")}`, "#DesignStudio", "#LuxuryContent"];
        cta = "Explore our latest works in bio.";
      }
      altText = `Editorial social presentation for ${brandName}.`;
      destinationUrl = aff?.affiliateUrl || aff?.productUrl || brand?.website || "";
      break;
    }

    case "LINKEDIN": {
      if (contentType === "AFFILIATE_PRODUCT" && aff) {
        caption = `Professional Tool Highlight: ${aff.productName}\n\nIn my daily work, efficiency and reliability are paramount. ${aff.productName} delivers key capabilities tailored for professionals:\n\n${aff.keyFeatures?.map((f) => `• ${f}`).join("\n") || ""}\n\n${affiliateDisclosure}`;
        cta = "Check out the full professional overview below.";
      } else if (contentType === "CERTIFICATION" && cert) {
        title = `Milestone Achievement: ${cert.certificationName}`;
        caption = `I am delighted to announce that I have completed the ${cert.certificationName} issued by ${cert.issuingOrganization}.\n\nDuring this program, I deepened expertise in:\n${cert.skillsLearned?.map((s) => `• ${s}`).join("\n") || "• Domain mastery"}\n\nThis certification marks an exciting milestone in my commitment to continuous professional development.`;
        cta = "View certificate credential details in the link below.";
      } else if (contentType === "TEACHING" && teach) {
        title = `Deep Dive: ${teach.topic}`;
        caption = `Professional Insights: ${teach.topic}\n\n${teach.learningObjective || ""}\n\n${teach.keyPoints?.map((kp, idx) => `${idx + 1}. ${kp}`).join("\n") || ""}${teach.codeExample ? `\n\nCode snippet:\n\`\`\`\n${teach.codeExample}\n\`\`\`` : ""}\n\nWhat are your thoughts on this approach? Let's discuss in the comments.`;
        cta = "Join the discussion in the comments.";
      } else {
        caption = `Strategic updates from ${brandName}. Driving innovation through excellence and design.`;
        cta = "Follow our company page for regular industry updates.";
      }
      hashtags = ["#ProfessionalDevelopment", "#CareerGrowth", "#IndustryInsights", "#Leadership"];
      destinationUrl = cert?.certificateUrl || aff?.productUrl || brand?.website || "";
      break;
    }

    case "THREADS": {
      if (contentType === "TEACHING" && teach) {
        caption = `Quick thought on ${teach.topic}: ${teach.keyPoints?.[0] || "Focus on fundamentals first."} What's your take?`;
      } else if (contentType === "CERTIFICATION" && cert) {
        caption = `Just completed the ${cert.certificationName}! Big thanks to ${cert.issuingOrganization} for a great program. 🎉`;
      } else if (contentType === "AFFILIATE_PRODUCT" && aff) {
        caption = `Been testing ${aff.productName} lately. Solid addition to the toolkit. ${affiliateDisclosure}`;
      } else {
        caption = `Behind the scenes at ${brandName}. What project are you building today?`;
      }
      hashtags = ["#buildinpublic", "#tech", "#creators"];
      break;
    }

    case "PINTEREST": {
      title = aff?.productName || cert?.certificationName || teach?.topic || `${brandName} Inspiration`;
      description = aff
        ? `${aff.productName} - ${aff.keyFeatures?.join(", ") || "Essential product for your collection"}. ${affiliateDisclosure}`
        : teach
        ? `Guide to ${teach.topic}. ${teach.learningObjective || "Step-by-step educational pin."}`
        : `${brandName} official pin design and style anchor.`;
      keywords = aff?.category ? [aff.category, "Product", "Guide", "Style"] : ["Tech", "Design", "Education", "Inspiration"];
      destinationUrl = aff?.affiliateUrl || aff?.productUrl || cert?.certificateUrl || brand?.website || "https://example.com";
      cta = "Click link to visit destination site";
      break;
    }

    case "FACEBOOK": {
      caption = aff
        ? `Introducing ${aff.productName}! Discover why it's gaining popular acclaim:\n${aff.keyFeatures?.map((f) => `✔️ ${f}`).join("\n") || ""}\n\n${affiliateDisclosure}`
        : cert
        ? `Celebration time! 🎉 I've just earned the ${cert.certificationName} from ${cert.issuingOrganization}!`
        : teach
        ? `Today's Topic: ${teach.topic}\n\n${teach.learningObjective || "Check out these practical takeaways!"}\n\n${teach.keyPoints?.map((p) => `👉 ${p}`).join("\n") || ""}`
        : `Stay updated with the latest news from ${brandName}.`;
      hashtags = ["#Community", "#Update", "#Announcements"];
      cta = "Like and share with your friends!";
      destinationUrl = aff?.productUrl || brand?.website || "";
      break;
    }

    case "TIKTOK": {
      caption = teach
        ? `Hook: Master ${teach.topic} in 60 seconds! ⚡ ${teach.keyPoints?.[0] || ""} #learnontiktok`
        : aff
        ? `Must-have item review: ${aff.productName}! 🔥 #tiktokfinds ${affiliateDisclosure}`
        : `Quick glance at ${brandName}! ✨ #fyp #aesthetic`;
      hashtags = ["#fyp", "#viral", "#tech", "#trending"];
      cta = "Check link in bio!";
      break;
    }

    case "YOUTUBE": {
      title = teach
        ? `Master ${teach.topic} | Complete Guide`
        : cert
        ? `How I Earned ${cert.certificationName} (${cert.issuingOrganization})`
        : aff
        ? `${aff.productName} Review & Walkthrough`
        : `${brandName} Official Video`;
      description = `${title}\n\nIn this video, we cover:\n${teach?.keyPoints?.map((k) => `- ${k}`).join("\n") || "- In-depth overview\n- Key practical applications"}\n\n${aff ? affiliateDisclosure : ""}\n\nSubscribe for more content from ${brandName}!`;
      keywords = ["YouTube", "Tutorial", "Review", "Guide", brandName];
      cta = "Subscribe and hit the bell notification!";
      break;
    }

    case "X": {
      if (contentType === "TEACHING" && teach) {
        caption = `🧵 Thread: How to master ${teach.topic}\n\n1/ ${teach.learningObjective || "Key principles you need to know:"}\n\n2/ ${teach.keyPoints?.[0] || "Focus on core concepts."}\n\n3/ ${teach.keyPoints?.[1] || "Apply in real-world scenarios."}`;
        platformMetadata = { isThread: true };
      } else if (contentType === "AFFILIATE_PRODUCT" && aff) {
        caption = `Quick look at ${aff.productName}: ${aff.keyFeatures?.[0] || "Great addition to your workflow."}\n\n🔗 ${aff.affiliateUrl || aff.productUrl || ""}\n${affiliateDisclosure}`;
      } else {
        caption = `Building next-gen social tools at ${brandName}. What features matter most to your workflow?`;
      }
      hashtags = ["#tech", "#dev", "#buildinpublic"];
      cta = "Retweet if helpful!";
      break;
    }

    case "REDDIT": {
      title = teach ? `[Guide] Understanding ${teach.topic}` : cert ? `[Discussion] My experience earning ${cert.certificationName}` : `Discussion: Insights from ${brandName}`;
      description = teach
        ? `I wanted to share a comprehensive breakdown of ${teach.topic}.\n\nKey Observations:\n${teach.keyPoints?.map((kp) => `- ${kp}`).join("\n") || ""}\n\n${teach.codeExample ? `\nCode example:\n\`\`\`\n${teach.codeExample}\n\`\`\`` : ""}\n\nLooking forward to constructive community feedback.`
        : `Sharing non-promotional educational notes on ${cert?.certificationName || brandName}.`;
      caption = description;
      // Note: Reddit affiliate content requires explicit human review and non-promotional tone
      platformMetadata = { subreddit: "r/programming", requiresHumanApproval: true };
      break;
    }

    case "TELEGRAM": {
      caption = aff
        ? `📢 **DEAL / TOOL ALERT**: ${aff.productName}\n\nFeatures:\n${aff.keyFeatures?.map((f) => `🔹 ${f}`).join("\n") || ""}\n\n👉 [Get It Here](${aff.affiliateUrl || aff.productUrl || "#"})\n\n_${affiliateDisclosure}_`
        : teach
        ? `📚 **LESSON**: ${teach.topic}\n\n${teach.learningObjective || ""}\n\n${teach.keyPoints?.map((p) => `• ${p}`).join("\n") || ""}`
        : `📢 Announcement from ${brandName}`;
      cta = "Join channel for daily updates!";
      break;
    }

    case "BLUESKY": {
      caption = teach
        ? `Exploring ${teach.topic}: ${teach.keyPoints?.[0] || "Deep dive into open protocols and algorithms."}`
        : `Latest work from ${brandName}. Open, decentralized social content creation.`;
      hashtags = ["#bluesky", "#openweb", "#tech"];
      break;
    }

    default: {
      caption = `Content update for ${brandName} on ${platform}.`;
      break;
    }
  }

  const generatedContent: Partial<PlatformContentData> = {
    platform,
    contentType,
    caption,
    title,
    description,
    hashtagsJson: hashtags,
    keywordsJson: keywords,
    cta,
    altText,
    destinationUrl,
    platformMetadataJson: platformMetadata,
    status: "DRAFT",
    approvalStatus: "PENDING",
  };

  const validation = validatePlatformContent(platform, generatedContent);
  return {
    ...generatedContent,
    validation,
  };
}
