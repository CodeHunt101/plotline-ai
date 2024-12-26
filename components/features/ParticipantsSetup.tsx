import { useMovieContext } from '@/contexts/MovieContext'

const MAX_PARTICIPANTS = 10

const ParticipantSetup = () => {
  const {
    timeAvailable,
    setGroupTimeAvailable,
    totalParticipants,
    setTotalParticipants,
    setShowParticipantSelect,
  } = useMovieContext()

  return (
    <div className="text-center">
      <h2 className="text-2xl mb-4">Let&apos;s set up your movie night!</h2>
      <div className="mb-6">
        <input
          type="range"
          min="1"
          max={MAX_PARTICIPANTS}
          value={totalParticipants}
          onChange={(e) => setTotalParticipants(Number(e.target.value))}
          className="range"
          step="1"
        />
        <div className="flex w-full justify-between px-2 text-xs">
          {Array.from({ length: MAX_PARTICIPANTS }, (_, i) => (
            <span key={i + 1}>{i + 1}</span>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          value={timeAvailable}
          onChange={(e) => setGroupTimeAvailable(e.target.value)}
          placeholder="How much time do you have?"
          className="input input-bordered w-full max-w-xs"
        />
      </div>

      <button
        onClick={() => setShowParticipantSelect(false)}
        className="btn btn-primary block mx-auto"
      >
        Start
      </button>
    </div>
  )
}

export default ParticipantSetup
