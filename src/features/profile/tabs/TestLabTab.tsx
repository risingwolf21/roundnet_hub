import { CardContent } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { AVAILABLE_FEATURES, useFeatureFlags } from "@/contexts/FeatureToggleContext";

export const TestLabTab = () => {
  const { toggleFeature, hasFeature } = useFeatureFlags();

  return (
    <>
      <CardContent className="px-0">
        {AVAILABLE_FEATURES.map((feature) => (
          <Field key={feature.key} className="px-4 py-2" orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={`switch-feature-${feature.key}`}>{feature.key}</FieldLabel>
              <FieldDescription>{feature.description}</FieldDescription>
            </FieldContent>
            <Switch
              id={`switch-feature-${feature.key}`}
              checked={hasFeature(feature.key)}
              onCheckedChange={() => toggleFeature("shadcnUI")}
            />
          </Field>
        ))}
      </CardContent>
    </>
  );
};
