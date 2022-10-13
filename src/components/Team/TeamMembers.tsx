import { useWeb3React } from "@web3-react/core";
import { useChainId } from "lib/chains";
import { useState } from "react";
import { getCurrentCompetitionIndex } from "domain/leaderboard/constants";
import { removeMember, useMemberTeam } from "domain/leaderboard/contracts";
import { useCompetition, useTeamMembersStats } from "domain/leaderboard/graph";
import { Team } from "domain/leaderboard/types";
import { shortenAddress } from "lib/legacy";
import TeamMembersHeader from "./TeamMembersHeader";

type Props = {
  team: Team;
  pendingTxns: any;
  setPendingTxns: any;
  onMembersChange: () => any;
};

export function TeamMembers({ onMembersChange, team, pendingTxns, setPendingTxns }: Props) {
  const { chainId } = useChainId();
  const { library, account } = useWeb3React();
  const [page, setPage] = useState(1);
  const perPage = 5;
  const {
    data: members,
    loading,
    revalidate: revalidateMembersStats,
  } = useTeamMembersStats(chainId, library, team.competitionIndex, team.leaderAddress, page, perPage);
  const [isRemoving, setIsRemoving] = useState(false);
  const { data: competition } = useCompetition(chainId, team.competitionIndex);

  const { hasTeam: accountHasTeam, data: memberTeam } = useMemberTeam(
    chainId,
    library,
    getCurrentCompetitionIndex(chainId),
    account
  );
  const isTeamLeader = () => account && account === team.leaderAddress;

  const showTeamMembersHeader = () =>
    competition.registrationActive &&
    account &&
    (isTeamLeader() || !accountHasTeam || memberTeam === team.leaderAddress);

  const pageCount = () => {
    return Math.ceil(team.members.length / perPage);
  };

  const handleRemoveClick = async (member) => {
    setIsRemoving(true);

    try {
      const tx = await removeMember(chainId, library, team.competitionIndex, team.leaderAddress, member.address, {
        successMsg: "User removed!",
        sentMsg: "User removal submitted!",
        failMsg: "User removal failed.",
        pendingTxns,
        setPendingTxns,
      });

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        onMembersChange();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <div className="Tab-title-section">
        <div className="Page-title">Members</div>
      </div>
      <div className="team-members-table-container">
        {showTeamMembersHeader() && (
          <TeamMembersHeader
            competition={competition}
            team={team}
            pendingTxns={pendingTxns}
            setPendingTxns={setPendingTxns}
            onMembersChange={() => {
              onMembersChange();
              revalidateMembersStats();
            }}
          />
        )}
        <table className="Exchange-list large App-box">
          <tbody>
            <tr className="Exchange-list-header">
              <th>Team Rank</th>
              <th>Address</th>
              <th>PnL</th>
            </tr>
            {loading && (
              <tr>
                <td colSpan={3}>Loading members...</td>
              </tr>
            )}
            {!loading &&
              members.map((member) => (
                <tr key={member.address}>
                  <td>#1</td>
                  <td>{member.address}</td>
                  <td>{member.pnl}</td>
                  <td>
                    {isTeamLeader() && member.address !== team.leaderAddress && competition.registrationActive && (
                      <button
                        className="Exchange-list-action"
                        disabled={isRemoving}
                        onClick={() => handleRemoveClick(member)}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {pageCount() > 1 && (
        <div className="simple-table-pagination">
          <button className="default-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
            Previous
          </button>
          <button className="default-btn" onClick={() => setPage((p) => p + 1)} disabled={page === pageCount()}>
            Next
          </button>
        </div>
      )}
      <div className="Exchange-list small">
        {members.map((member) => (
          <div key={member.address} className="App-card">
            <div className="App-card-title">
              <span className="label">{shortenAddress(member.address, 12)}</span>
            </div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">PnL</div>
                <div>{member.pnl}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}