import { trpc } from "@rallly/backend";
import {
  ChartSquareBarIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@rallly/icons";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import React from "react";

import { Card } from "@/components/card";
import {
  TopBar,
  TopBarTitle,
} from "@/components/layouts/standard-layout/top-bar";
import { Trans } from "@/components/trans";
import { usePostHog } from "@/utils/posthog";

import { Button } from "./button";
import {
  NewEventData,
  PollDetailsData,
  PollDetailsForm,
  PollOptionsData,
  PollOptionsForm,
  UserDetailsData,
  UserDetailsForm,
} from "./forms";
import Steps from "./steps";
import { useUser } from "./user-provider";

type StepName = "eventDetails" | "options" | "userDetails";

const required = <T,>(v: T | undefined): T => {
  if (!v) {
    throw new Error("Required value is missing");
  }

  return v;
};

export interface CreatePollPageProps {
  title?: string;
  location?: string;
  description?: string;
  view?: "week" | "month";
}

const Page: React.FunctionComponent = () => {
  const { t } = useTranslation();

  const router = useRouter();

  const session = useUser();

  const steps: StepName[] = React.useMemo(
    () =>
      session.user.isGuest
        ? ["eventDetails", "options", "userDetails"]
        : ["eventDetails", "options"],
    [session.user.isGuest],
  );

  const [formData, setFormData] = React.useState<NewEventData>({
    currentStep: 0,
  });

  React.useEffect(() => {
    const newStep = Math.min(steps.length - 1, formData.currentStep);
    if (newStep !== formData.currentStep) {
      setFormData((prevData) => ({
        ...prevData,
        currentStep: newStep,
      }));
    }
  }, [formData.currentStep, steps.length]);

  const currentStepIndex = formData?.currentStep ?? 0;

  const currentStepName = steps[currentStepIndex];

  const [isRedirecting, setIsRedirecting] = React.useState(false);

  const posthog = usePostHog();
  const queryClient = trpc.useContext();
  const createPoll = trpc.polls.create.useMutation({
    onSuccess: (res) => {
      setIsRedirecting(true);
      posthog?.capture("created poll", {
        pollId: res.id,
        numberOfOptions: formData.options?.options?.length,
        optionsView: formData?.options?.view,
      });
      router.replace(`/poll/${res.id}`);
      queryClient.polls.list.invalidate();
    },
  });

  const isBusy = isRedirecting || createPoll.isLoading;

  const handleSubmit = async (
    data: PollDetailsData | PollOptionsData | UserDetailsData,
  ) => {
    if (currentStepIndex < steps.length - 1) {
      setFormData({
        ...formData,
        currentStep: currentStepIndex + 1,
        [currentStepName]: data,
      });
    } else {
      // last step
      const title = required(formData?.eventDetails?.title);

      await createPoll.mutateAsync({
        title: title,
        location: formData?.eventDetails?.location,
        description: formData?.eventDetails?.description,
        user: session.user.isGuest
          ? {
              name: required(formData?.userDetails?.name),
              email: required(formData?.userDetails?.contact),
            }
          : undefined,
        timeZone: formData?.options?.timeZone,
        options: required(formData?.options?.options).map((option) => ({
          startDate: option.type === "date" ? option.date : option.start,
          endDate: option.type === "timeSlot" ? option.end : undefined,
        })),
      });
    }
  };

  const handleChange = (
    data: Partial<PollDetailsData | PollOptionsData | UserDetailsData>,
  ) => {
    setFormData({
      ...formData,
      currentStep: currentStepIndex,
      [currentStepName]: data,
    });
  };

  return (
    <div>
      <TopBar className="flex justify-between p-3">
        <div className="hidden sm:block">
          <TopBarTitle
            icon={ChartSquareBarIcon}
            title={<Trans i18nKey="newPoll" />}
          />
        </div>
        <Steps current={currentStepIndex} total={steps.length} />
        <div className="flex justify-end gap-x-2">
          {currentStepIndex > 0 ? (
            <Button
              icon={<ChevronLeftIcon />}
              disabled={isBusy}
              onClick={() => {
                setFormData({
                  ...formData,
                  currentStep: currentStepIndex - 1,
                });
              }}
            ></Button>
          ) : null}

          {currentStepIndex < steps.length - 1 ? (
            <Button form={currentStepName} loading={isBusy} htmlType="submit">
              {t("continue")}
            </Button>
          ) : (
            <Button
              form={currentStepName}
              type="primary"
              icon={<CheckIcon />}
              loading={isBusy}
              htmlType="submit"
            >
              {t("createPoll")}
            </Button>
          )}
        </div>
      </TopBar>
      <div className="mx-auto max-w-4xl py-4 sm:p-4 lg:p-8">
        <div className="max-w-full">
          <Card fullWidthOnMobile={true}>
            <div className="">
              {(() => {
                switch (currentStepName) {
                  case "eventDetails":
                    return (
                      <PollDetailsForm
                        className="max-w-full p-3 sm:p-4"
                        name={currentStepName}
                        defaultValues={formData?.eventDetails}
                        onSubmit={handleSubmit}
                        onChange={handleChange}
                      />
                    );
                  case "options":
                    return (
                      <PollOptionsForm
                        className="grow"
                        name={currentStepName}
                        defaultValues={formData?.options}
                        onSubmit={handleSubmit}
                        onChange={handleChange}
                        title={formData.eventDetails?.title}
                      />
                    );
                  case "userDetails":
                    return (
                      <UserDetailsForm
                        className="grow p-4"
                        name={currentStepName}
                        defaultValues={formData?.userDetails}
                        onSubmit={handleSubmit}
                        onChange={handleChange}
                      />
                    );
                }
              })()}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Page;
