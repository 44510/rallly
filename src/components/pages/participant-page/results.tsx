import { VoteType } from "@prisma/client";
import clsx from "clsx";
import dayjs from "dayjs";
import { useTranslation } from "next-i18next";

import VoteIcon from "../../poll/vote-icon";
import { useUser } from "../../user-provider";
import { useParticipant, useParticipants } from "./participants-context";
import { useOption, usePoll } from "./poll-context";
import { StyledList, StyledListItem } from "./styled-list";

interface ParticipantProps {
  participantId: string;
  vote?: VoteType;
}
const Participant = ({ participantId, vote }: ParticipantProps) => {
  const participant = useParticipant(participantId);
  const { user } = useUser();
  const { t } = useTranslation("app");
  return (
    <div className="flex h-9 gap-3">
      <div
        className={clsx(
          "relative inline-flex h-6 w-6 items-center justify-center rounded-full text-xs uppercase text-white",
          participant.color,
        )}
      >
        <div>{participant.name[0]}</div>
        {vote ? (
          <div
            className={clsx(
              "absolute right-0 -top-1 inline-flex h-3 w-3 translate-x-1/2 items-center justify-center rounded-full ring-2 ring-white",
              {
                "bg-green-400": vote === "yes",
                "bg-amber-400": vote === "ifNeedBe",
                "bg-slate-300": vote === "no",
              },
            )}
          >
            <VoteIcon type={vote} size="sm" />
          </div>
        ) : null}
      </div>
      <div className="font-medium text-slate-500">{participant.name}</div>
      {/* {user.id === participant.userId ? (
        <div className="rounded-full bg-slate-100 px-2 text-sm text-slate-400">
          {t("you")}
        </div>
      ) : null} */}
    </div>
  );
};

const ParticipantGrid = ({ optionId }: { optionId: string }) => {
  const participants = useParticipants();
  const yesVotes = participants.filter((participant) =>
    participant.votes.find((v) => v.optionId === optionId && v.type === "yes"),
  );
  const ifNeedBeVotes = participants.filter((participant) =>
    participant.votes.find(
      (v) => v.optionId === optionId && v.type === "ifNeedBe",
    ),
  );
  const noVotes = participants.filter((participant) =>
    participant.votes.find((v) => v.optionId === optionId && v.type === "no"),
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="">
        {yesVotes.map((participant) => {
          return (
            <Participant
              key={participant.id}
              participantId={participant.id}
              vote="yes"
            />
          );
        })}
      </div>
      <div>
        {ifNeedBeVotes.map((participant) => {
          return (
            <Participant
              key={participant.id}
              participantId={participant.id}
              vote="ifNeedBe"
            />
          );
        })}
        {noVotes.map((participant) => {
          return (
            <Participant
              key={participant.id}
              participantId={participant.id}
              vote="no"
            />
          );
        })}
      </div>
    </div>
  );
};

const Option = (props: { optionId: string }) => {
  const { option } = useOption(props.optionId);
  if (option.duration > 0) {
    return <div>{dayjs(option.start).format("LT")}</div>;
  }
  return <div>{dayjs(option.start).format("D dddd")}</div>;
};

export const Results = () => {
  const { options } = usePoll();
  return (
    <StyledList
      options={options}
      itemRender={({ item }) => {
        return (
          <div className="space-y-4 rounded border p-3">
            <StyledListItem duration={item.duration} start={item.start} />
            <ParticipantGrid optionId={item.id} />
          </div>
        );
      }}
    />
  );
};