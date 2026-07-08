// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title EvidenceRegistry - registo de evidencias e cadeia de custodia
/// @notice MVP academico. A escrita e restrita ao endereco do backend (owner).
/// @dev LIMITACAO ASSUMIDA (ver README, "Modelo de Confianca"): numa chain local
///      com uma unica chave de escrita, a imutabilidade depende do operador do no.
///      A garantia real exige uma chain permissionada com validadores independentes
///      (ex.: Hyperledger Besu). Este contrato demonstra o MECANISMO, nao a garantia.
contract EvidenceRegistry {
    struct EvidenceRecord {
        bytes32 sha256Hash;   // hash SHA-256 do ficheiro - nunca muda
        string custodian;     // id (UUID) do custodiante actual
        uint256 registeredAt; // timestamp do bloco de registo
        bool exists;
    }

    struct CustodyRecord {
        string fromUser;
        string toUser;
        string reason;
        uint256 timestamp;
    }

    address public owner;

    // chave = keccak256(evidenceId UUID) para custo fixo de armazenamento
    mapping(bytes32 => EvidenceRecord) private evidences;
    mapping(bytes32 => CustodyRecord[]) private history;

    event EvidenceRegistered(
        bytes32 indexed key,
        string evidenceId,
        bytes32 sha256Hash,
        string custodian,
        uint256 timestamp
    );

    event CustodyTransferred(
        bytes32 indexed key,
        string evidenceId,
        string fromUser,
        string toUser,
        string reason,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "EvidenceRegistry: caller is not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function _key(string memory evidenceId) private pure returns (bytes32) {
        return keccak256(bytes(evidenceId));
    }

    /// @notice Regista uma evidencia. Falha se o id ja existir - evidencias sao
    ///         imutaveis; uma "alteracao" e uma NOVA evidencia (nova versao)
    ///         com novo id e novo hash, ligada a anterior no backend.
    function registerEvidence(
        string calldata evidenceId,
        bytes32 sha256Hash,
        string calldata custodian
    ) external onlyOwner {
        require(sha256Hash != bytes32(0), "hash cannot be zero");
        bytes32 key = _key(evidenceId);
        require(!evidences[key].exists, "evidence already registered");

        evidences[key] = EvidenceRecord({
            sha256Hash: sha256Hash,
            custodian: custodian,
            registeredAt: block.timestamp,
            exists: true
        });

        emit EvidenceRegistered(key, evidenceId, sha256Hash, custodian, block.timestamp);
    }

    /// @notice Transfere custodia. Regra de negocio replicada on-chain:
    ///         apenas o custodiante actual pode ceder a evidencia.
    function transferCustody(
        string calldata evidenceId,
        string calldata fromUser,
        string calldata toUser,
        string calldata reason
    ) external onlyOwner {
        bytes32 key = _key(evidenceId);
        EvidenceRecord storage ev = evidences[key];
        require(ev.exists, "evidence not found");
        require(
            keccak256(bytes(ev.custodian)) == keccak256(bytes(fromUser)),
            "fromUser is not current custodian"
        );
        require(
            keccak256(bytes(fromUser)) != keccak256(bytes(toUser)),
            "cannot transfer to self"
        );

        ev.custodian = toUser;
        history[key].push(
            CustodyRecord({ fromUser: fromUser, toUser: toUser, reason: reason, timestamp: block.timestamp })
        );

        emit CustodyTransferred(key, evidenceId, fromUser, toUser, reason, block.timestamp);
    }

    /// @notice Verificacao de integridade: compara um hash recalculado com o registado.
    function verifyEvidence(string calldata evidenceId, bytes32 sha256Hash)
        external
        view
        returns (bool)
    {
        EvidenceRecord storage ev = evidences[_key(evidenceId)];
        require(ev.exists, "evidence not found");
        return ev.sha256Hash == sha256Hash;
    }

    function getEvidence(string calldata evidenceId)
        external
        view
        returns (bytes32 sha256Hash, string memory custodian, uint256 registeredAt, bool exists)
    {
        EvidenceRecord storage ev = evidences[_key(evidenceId)];
        return (ev.sha256Hash, ev.custodian, ev.registeredAt, ev.exists);
    }

    function getHistory(string calldata evidenceId)
        external
        view
        returns (CustodyRecord[] memory)
    {
        return history[_key(evidenceId)];
    }
}
